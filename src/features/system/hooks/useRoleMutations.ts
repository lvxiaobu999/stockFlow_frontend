import { useMutation, useQueryClient } from '@tanstack/react-query'
import { roleService } from '@/features/system/services/roleService'
import type { CreateRolePayload, UpdateRolePayload } from '@/features/system/types'
import { roleQueryKeys } from '@/features/system/hooks/useRoles'

/**
 * 角色增改与权限保存 mutation 集合。
 *
 * 角色的用户数来自用户数据（useUserMutations 已做交叉失效），这里
 * 保存权限后只需失效该角色的权限码缓存。
 */
export function useRoleMutations() {
  const queryClient = useQueryClient()
  const invalidateRoles = () => {
    queryClient.invalidateQueries({ queryKey: roleQueryKeys.all })
  }

  const create = useMutation({
    mutationFn: (payload: CreateRolePayload) => roleService.create(payload),
    onSuccess: invalidateRoles,
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) => roleService.update(id, payload),
    onSuccess: invalidateRoles,
  })
  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 1 | 0 }) => roleService.toggleStatus(id, status),
    onSuccess: invalidateRoles,
  })
  const savePermissions = useMutation({
    mutationFn: ({ id, permissionCodes }: { id: string; permissionCodes: string[] }) =>
      roleService.saveRolePermissions(id, { permissionCodes }),
    // 权限「下次登录生效」：只更新缓存里的勾选状态，不热更新当前会话权限。
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: roleQueryKeys.permissions(variables.id) })
    },
  })

  return { create, update, toggleStatus, savePermissions }
}
