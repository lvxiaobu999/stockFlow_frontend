import { useMutation } from '@tanstack/react-query'
import { authService } from '@/features/auth/services/authService'
import type { ChangePasswordPayload } from '@/features/auth/types'

/** 修改密码 mutation：原密码不符时后端返回 400，错误信息由表单展示。 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authService.changePassword(payload),
  })
}
