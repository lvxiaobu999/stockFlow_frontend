import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { roleService } from '@/features/system/services/roleService'
import type { PaginatedData } from '@/services/httpClient'
import type { RoleListParams, RoleRecord } from '@/features/system/types'

export const roleQueryKeys = {
  /** 角色查询共用的根 key，增改与权限保存后整体失效。 */
  all: ['system', 'roles'] as const,
  page: (params: RoleListParams) => [...roleQueryKeys.all, 'page', params] as const,
  /** 启用角色下拉（用户表单、列表筛选项共用）。 */
  options: () => [...roleQueryKeys.all, 'options'] as const,
  /** 全量权限树，所有角色共用一份。 */
  permissionTree: () => [...roleQueryKeys.all, 'permission-tree'] as const,
  /** 某角色已勾选的权限码。 */
  permissions: (id: string) => [...roleQueryKeys.all, id, 'permissions'] as const,
  /** 拥有某角色的用户列表。 */
  users: (id: string) => [...roleQueryKeys.all, id, 'users'] as const,
}

export interface RolesQuery {
  data: PaginatedData<RoleRecord> | null
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => Promise<unknown>
}

/** 角色分页查询：翻页时保留上一页数据，避免整表闪烁。 */
export function useRoles(params: RoleListParams): RolesQuery {
  const query = useQuery({
    queryKey: roleQueryKeys.page(params),
    queryFn: ({ signal }) => roleService.getPage(params, signal),
    placeholderData: keepPreviousData,
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/** 启用中的角色下拉选项。 */
export function useRoleOptions() {
  const query = useQuery({
    queryKey: roleQueryKeys.options(),
    queryFn: ({ signal }) => roleService.getOptions(signal),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 全量权限树（菜单 → 页面 → 按钮）。 */
export function usePermissionTree() {
  const query = useQuery({
    queryKey: roleQueryKeys.permissionTree(),
    queryFn: ({ signal }) => roleService.getPermissionTree(signal),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 某角色已勾选的权限码；id 为空字符串时不发起请求（配置面板未打开）。 */
export function useRolePermissions(id: string) {
  const query = useQuery({
    queryKey: roleQueryKeys.permissions(id),
    queryFn: ({ signal }) => roleService.getRolePermissions(id, signal),
    enabled: id !== '',
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 拥有某角色的用户列表；id 为空字符串时不发起请求。 */
export function useRoleUsers(id: string) {
  const query = useQuery({
    queryKey: roleQueryKeys.users(id),
    queryFn: ({ signal }) => roleService.getRoleUsers(id, signal),
    enabled: id !== '',
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  }
}
