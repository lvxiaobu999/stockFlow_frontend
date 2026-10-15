import { HttpResponse } from 'msw'

/**
 * MSW 响应构造工具：统一信封结构与错误语义，避免每个 handler 重复字面量。
 *
 * - 成功：HTTP 200 + code 1；
 * - 业务失败：HTTP 200 + code !== 1（前端 ApiError 会携带业务码）；
 * - HTTP 失败（401/403 等）：message 会被前端 normalizeError 透传给用户。
 *
 * 三个构造器返回同一类型（data 放宽为 unknown）：MSW 会按 handler 内第一个
 * 返回值推断响应体类型，若各自带精确 data 泛型，同一条 handler 里混用会编译报错。
 */

/** Mock 响应体统一形状。 */
interface MockEnvelope {
  code: number
  message: string
  data: unknown
}

/** 构造成功响应（code === 1）。 */
export function ok<T>(data: T): HttpResponse<MockEnvelope> {
  return HttpResponse.json({ code: 1, message: 'success', data })
}

/** 构造业务失败响应：HTTP 层成功、由 code 区分，用于可预期的领域冲突（如编码重复）。 */
export function businessError(code: number, message: string): HttpResponse<MockEnvelope> {
  return HttpResponse.json({ code, message, data: null })
}

/** 构造 HTTP 层失败响应（401 未登录、403 禁止等），前端按 status 分支处理。 */
export function httpError(status: number, message: string): HttpResponse<MockEnvelope> {
  return HttpResponse.json({ code: status, message, data: null }, { status })
}
