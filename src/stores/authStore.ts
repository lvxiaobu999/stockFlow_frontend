import { create } from 'zustand'
import type { AuthSession, CurrentUser } from '@/features/auth/types'
import { devtools } from 'zustand/middleware'

interface AuthState {
  /** 当前登录用户；null 表示未登录（处于登录页或会话尚未恢复）。 */
  currentUser: CurrentUser | null
  /** 当前用户的权限码集合（菜单码 + 按钮码，'*' 为全权）；随会话恢复写入。 */
  permissions: string[]
  /** 登录成功或 /auth/me 恢复成功后写入完整会话，是本 store 的唯一写入口。 */
  setSession: (session: AuthSession) => void
  /** 清空会话：退出登录或会话过期时调用。 */
  clearSession: () => void
}

/**
 * 跨路由的登录会话状态。
 *
 * 只保存用户信息与权限码等非敏感数据；凭证由 Cookie 会话维持，
 * 不写入 localStorage。刷新页面后的会话恢复由 features/auth 的
 * useAuthSession 引导查询完成。
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      currentUser: null,
      permissions: [],
      // AuthSession 的用户字段名为 user，store 内统一叫 currentUser（对外语义更直白）。
      setSession: ({ user, permissions }) => set({ currentUser: user, permissions }),
      clearSession: () => set({ currentUser: null, permissions: [] }),
    }),
    {
      name: 'AuthStore',
    },
  ),
)
