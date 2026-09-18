import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { appEnv } from '@/config/env'

/** 所有接口都使用这一层响应信封，业务成功由 code === 1 表示。 */
export interface ApiResponse<T> {
  /** 业务状态码：严格按照约定，只有 1 才代表本次请求成功。 */
  code: number
  /** 后端返回给用户或日志使用的提示信息。 */
  message: string
  /** 请求真正返回的业务数据，分页时这里是 PaginatedData<T>。 */
  data: T
}

/** 分页接口的 data 结构。total 按后端约定表示总页数。 */
export interface PaginatedData<T> {
  /** 当前页码，从后端返回，避免前端自行推断。 */
  current: number
  /** 当前页包含的最大数据条数。 */
  pageSize: number
  /** 数据总页数（按项目接口约定，不是数据总条数）。 */
  total: number
  /** 当前页的数据列表。 */
  lists: T[]
}

/** Axios 请求的统一超时时间，防止网络异常时页面永久等待。 */
export const API_TIMEOUT_MS = 15_000

export class ApiError extends Error {
  /** HTTP 层状态码；网络错误没有响应时为 0。 */
  readonly status: number
  /** 业务层错误码；HTTP 成功但 code !== 1 时才会有值。 */
  readonly code?: number

  constructor(message: string, status: number, code?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export type RequestOptions<D = unknown> = AxiosRequestConfig<D>

/**
 * 全局 Axios 实例。
 *
 * 所有 feature service 都应复用这个实例，以保证 baseURL、Cookie、超时、
 * 请求头以及错误处理策略一致；页面和展示组件不要直接创建 Axios 实例。
 */
export const apiClient = axios.create({
  baseURL: appEnv.apiBaseUrl,
  withCredentials: true,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
  },
})

function normalizeError(error: AxiosError<unknown>): ApiError {
  // HTTP 失败时优先使用后端返回的 message，这样用户能看到更准确的失败原因。
  const status = error.response?.status ?? 0
  const responseData = error.response?.data
  const responseMessage =
    typeof responseData === 'object' && responseData !== null && 'message' in responseData
      ? responseData.message
      : undefined
  // 没有后端提示时，再根据是否拿到 HTTP 响应区分服务端错误和网络错误。
  const message =
    typeof responseMessage === 'string'
      ? responseMessage
      : status
        ? `Request failed (${status})`
        : 'Network request failed'
  return new ApiError(message, status)
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  // 外部响应数据是不可信的 unknown，先检查对象和必要字段，再交给类型系统使用。
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { code?: unknown; message?: unknown }
  return typeof candidate.code === 'number' && typeof candidate.message === 'string' && 'data' in candidate
}

/**
 * 校验并解包统一响应信封。
 *
 * 这里集中处理两类错误：响应格式不符合约定，或后端返回业务失败码。
 * service 层因此只需要关心成功时的 T，不必在每个接口重复判断 code。
 */
export function unwrapApiResponse<T>(payload: unknown, status = 200): T {
  if (!isApiResponse<T>(payload)) {
    throw new ApiError('Invalid API response', status)
  }
  if (payload.code !== 1) {
    throw new ApiError(payload.message || 'Request failed', status, payload.code)
  }
  return payload.data
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // AbortSignal 取消请求是调用方的正常控制流，不要把它改写成普通网络错误。
    if (axios.isCancel(error)) return Promise.reject(error)
    // Axios 错误统一转换成 ApiError，页面可以稳定读取 message/status。
    if (axios.isAxiosError(error)) return Promise.reject(normalizeError(error))
    return Promise.reject(error instanceof Error ? error : new Error('Request failed'))
  },
)

export async function request<T, D = unknown>(path: string, options: RequestOptions<D> = {}): Promise<T> {
  // 泛型 T 表示解包后的业务数据类型；D 表示请求体类型，二者互不混淆。
  const response = await apiClient.request<ApiResponse<T>, AxiosResponse<ApiResponse<T>>, D>({
    url: path,
    ...options,
  })
  // Axios 成功只代表 HTTP 层成功，仍需检查业务 code 后才能返回 data。
  return unwrapApiResponse<T>(response.data, response.status)
}
