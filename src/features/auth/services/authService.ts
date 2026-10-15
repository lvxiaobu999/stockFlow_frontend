import type {
  AuthSession,
  ChangePasswordPayload,
  CurrentUser,
  LoginPayload,
  UpdateProfilePayload,
} from '@/features/auth/types'
import { request } from '@/services/httpClient'

/**
 * 认证服务：登录 / 退出 / 会话恢复 / 资料与密码维护。
 *
 * 登录态由 Cookie 会话维持（httpClient 已开启 withCredentials），
 * 前端不保存任何凭证；本模块的错误语义：
 * - 401：未登录或会话过期（守卫据此跳转登录页）；
 * - 403：账号被停用，或供应商账号误从管理端登录。
 */
export const authService = {
  /** 账号密码登录；失败时抛出 ApiError（message 为统一文案「账号或密码错误」）。 */
  async login(payload: LoginPayload): Promise<AuthSession> {
    return request<AuthSession>('/auth/login', { method: 'POST', data: payload })
  },

  /** 退出登录；即使接口失败前端也会清理本地会话后跳转。 */
  async logout(): Promise<null> {
    return request<null>('/auth/logout', { method: 'POST' })
  },

  /**
   * 恢复当前会话（刷新页面后调用）。
   * TanStack Query 会在查询失效、组件卸载时触发 signal，透传给 request 才能真正取消请求。
   */
  async getMe(signal?: AbortSignal): Promise<AuthSession> {
    return request<AuthSession>('/auth/me', { signal })
  },

  /** 修改当前用户基本资料（姓名 / 手机号 / 邮箱），返回更新后的用户信息。 */
  async updateProfile(payload: UpdateProfilePayload): Promise<CurrentUser> {
    return request<CurrentUser>('/auth/profile', { method: 'PUT', data: payload })
  },

  /** 修改登录密码；原密码不符时后端返回 400。 */
  async changePassword(payload: ChangePasswordPayload): Promise<null> {
    return request<null>('/auth/password', { method: 'PUT', data: payload })
  },
}
