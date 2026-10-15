import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LOGIN_PATH } from '@/config/routes'
import { authService } from '@/features/auth/services/authService'
import { useAuthStore } from '@/stores/authStore'

/**
 * 退出登录 mutation：无论接口成败都清理本地会话并返回登录页。
 * 同时清空 React Query 缓存，防止下一个账号命中上一个账号的数据。
 */
export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      useAuthStore.getState().clearSession()
      queryClient.clear()
      navigate(LOGIN_PATH, { replace: true })
    },
  })
}
