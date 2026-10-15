import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { authService } from '@/features/auth/services/authService'
import type { LoginPayload } from '@/features/auth/types'
import { authQueryKeys } from '@/features/auth/hooks/useAuthSession'
import { useAuthStore } from '@/stores/authStore'

/**
 * 登录 mutation：成功后写入会话 store 与 /auth/me 缓存，并跳回来源页面。
 * 登录失败（统一文案「账号或密码错误」、停用、供应商误入）由调用方读取
 * mutation.error 展示，不在 hook 内弹窗。
 */
export function useLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (session) => {
      useAuthStore.getState().setSession(session)
      // 预填 /auth/me 缓存，登录后不再发第二次会话请求。
      queryClient.setQueryData(authQueryKeys.me(), session)
      // 守卫跳转登录页时会记录来源路径，登录成功后优先回去。
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? routeMeta.dashboard.path, { replace: true })
    },
  })
}
