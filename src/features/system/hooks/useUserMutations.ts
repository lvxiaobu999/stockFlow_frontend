import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/features/system/services/userService'
import type { CreateUserPayload, EnableStatus, UpdateUserPayload } from '@/features/system/types'
import { roleQueryKeys } from '@/features/system/hooks/useRoles'
import { userQueryKeys } from '@/features/system/hooks/useUsers'

/**
 * 用户增改 mutation 集合。
 *
 * 用户数据同时影响角色列表的「用户数」与角色详情卡，因此成功后
 * 用户与角色两组查询一并失效。
 */
export function useUserMutations() {
  const queryClient = useQueryClient()
  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: userQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: roleQueryKeys.all })
  }

  const create = useMutation({
    mutationFn: (payload: CreateUserPayload) => userService.create(payload),
    onSuccess: invalidateRelated,
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) => userService.update(id, payload),
    onSuccess: invalidateRelated,
  })
  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password?: string }) => userService.resetPassword(id, password),
  })
  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnableStatus }) => userService.toggleStatus(id, status),
    onSuccess: invalidateRelated,
  })

  return { create, update, resetPassword, toggleStatus }
}
