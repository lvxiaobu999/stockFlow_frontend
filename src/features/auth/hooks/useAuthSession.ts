import { useQuery } from '@tanstack/react-query'
import { authService } from '@/features/auth/services/authService'
import { ApiError } from '@/services/httpClient'
import { useAuthStore } from '@/stores/authStore'

export const authQueryKeys = {
  /** 所有认证查询共用的根 key，便于整体失效。 */
  all: ['auth'] as const,
  /** 会话引导查询的子 key；登录成功后也会用 setQueryData 写入同一缓存。 */
  me: () => [...authQueryKeys.all, 'me'] as const,
}

export interface AuthSessionQuery {
  /** 会话是否已确认有效（/auth/me 成功）。 */
  isAuthenticated: boolean
  /** 会话是否正在恢复中（应用刚挂载时为 true）。 */
  isLoading: boolean
  /** 恢复失败的非 401 错误（如网络异常）；401 属未登录正常分支，不出现在这里。 */
  error: Error | null
  /** 手动重试会话恢复，用于网络异常后的「重试」入口。 */
  refetch: () => Promise<unknown>
}

/**
 * 会话引导查询：应用挂载时调用 /auth/me 恢复登录态。
 *
 * 查询成功即把会话写入 authStore（在 queryFn 内完成，保证守卫读到 store
 * 时数据已就绪）；整个标签页生命周期内缓存有效，不会重复请求。
 */
export function useAuthSession(): AuthSessionQuery {
  const query = useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: async ({ signal }) => {
      const session = await authService.getMe(signal)
      useAuthStore.getState().setSession(session)
      return session
    },
    // 会话在标签页生命周期内有效，避免任何交互触发重复请求。
    staleTime: Infinity,
    gcTime: Infinity,
    // 401 表示「未登录」而非故障，重试没有意义。
    retry: false,
  })

  return {
    isAuthenticated: query.isSuccess,
    isLoading: query.isPending,
    // 401 是「未登录」的正常分支而非故障：从 error 中剔除，否则 RequireAuth
    // 会把未登录访客误导向「恢复失败」错误屏，永远到不了登录页。
    error: query.error instanceof ApiError && query.error.status === 401 ? null : query.error,
    refetch: query.refetch,
  }
}
