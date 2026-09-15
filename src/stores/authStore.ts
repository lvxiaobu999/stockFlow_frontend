import { create } from 'zustand'

export interface CurrentUser {
  id: string
  name: string
  role: string
}

interface AuthState {
  currentUser: CurrentUser | null
  unreadNotifications: number
  setCurrentUser: (user: CurrentUser | null) => void
  setUnreadNotifications: (count: number) => void
  clearSession: () => void
}

/** 内存会话状态。敏感凭证不会写入 localStorage。 */
export const useAuthStore = create<AuthState>()((set) => ({
  currentUser: { id: 'demo-user', name: '管理员', role: '系统管理员' },
  unreadNotifications: 3,
  setCurrentUser: (currentUser) => set({ currentUser }),
  setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
  clearSession: () => set({ currentUser: null, unreadNotifications: 0 }),
}))
