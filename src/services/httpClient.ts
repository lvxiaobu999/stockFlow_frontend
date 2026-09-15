import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import { appEnv } from '@/config/env'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export type RequestOptions<D = unknown> = AxiosRequestConfig<D>

/** 全局 Axios 实例。业务 service 应使用它，不要自行创建 Axios 实例。 */
export const apiClient = axios.create({
  baseURL: appEnv.apiBaseUrl,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
})

function normalizeError(error: AxiosError<unknown>): ApiError {
  const status = error.response?.status ?? 0
  const message = status ? `请求失败（${status}）` : '网络请求失败，请检查网络连接'
  return new ApiError(message, status)
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) return Promise.reject(normalizeError(error))
    return Promise.reject(error instanceof Error ? error : new Error('请求失败'))
  },
)

export async function request<T, D = unknown>(path: string, options: RequestOptions<D> = {}): Promise<T> {
  const response = await apiClient.request<T, { data: T }, D>({
    url: path,
    ...options,
  })
  return response.data
}
