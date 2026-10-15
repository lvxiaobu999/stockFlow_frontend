import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/features/auth/services/authService'
import type { UpdateProfilePayload } from '@/features/auth/types'
import { authQueryKeys } from '@/features/auth/hooks/useAuthSession'
import { useAuthStore } from '@/stores/authStore'

/** 修改基本资料 mutation：成功后同步 authStore 与 /auth/me 缓存，顶栏立即反映新姓名。 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => authService.updateProfile(payload),
    onSuccess: (user) => {
      const { currentUser, permissions } = useAuthStore.getState()
      if (currentUser) {
        useAuthStore.getState().setSession({ user, permissions })
      }
      queryClient.setQueryData(authQueryKeys.me(), (prev: { user: typeof user } | undefined) =>
        prev ? { ...prev, user } : prev,
      )
    },
  })
}
