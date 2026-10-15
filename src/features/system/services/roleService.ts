import type {
  CreateRolePayload,
  EnableStatus,
  PermissionNode,
  RoleListParams,
  RoleRecord,
  SaveRolePermissionsPayload,
  UpdateRolePayload,
  UserRecord,
} from '@/features/system/types'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/**
 * 角色管理服务：角色档案 + 权限树配置。
 * 权限保存后「下次登录生效」，后端不会热更新在线会话。
 */
export const roleService = {
  /** 分页查询角色；返回结构遵循 PaginatedData 约定（total 为总页数）。 */
  async getPage(params: RoleListParams, signal?: AbortSignal): Promise<PaginatedData<RoleRecord>> {
    return request<PaginatedData<RoleRecord>>('/system/role/page', { params, signal })
  },

  /** 启用中的角色列表，供用户表单的角色多选与列表筛选项使用。 */
  async getOptions(signal?: AbortSignal): Promise<RoleRecord[]> {
    return request<RoleRecord[]>('/system/role/options', { signal })
  },

  /** 新建角色；编码重复时后端返回业务码 4002。 */
  async create(payload: CreateRolePayload): Promise<RoleRecord> {
    return request<RoleRecord>('/system/role', { method: 'POST', data: payload })
  },

  /** 编辑角色名称与描述；编码不可修改。 */
  async update(id: string, payload: UpdateRolePayload): Promise<RoleRecord> {
    return request<RoleRecord>(`/system/role/${id}`, { method: 'PUT', data: payload })
  },

  /** 启用 / 停用角色；内置角色（admin / supplier）不允许停用（业务码 4003）。 */
  async toggleStatus(id: string, status: EnableStatus): Promise<RoleRecord> {
    return request<RoleRecord>(`/system/role/${id}/status`, { method: 'PUT', data: { status } })
  },

  /** 全量权限树（菜单 → 页面 → 按钮），角色权限配置面板使用。 */
  async getPermissionTree(signal?: AbortSignal): Promise<PermissionNode[]> {
    return request<PermissionNode[]>('/system/permission/tree', { signal })
  },

  /** 读取角色已勾选的权限码集合。 */
  async getRolePermissions(id: string, signal?: AbortSignal): Promise<string[]> {
    return request<string[]>(`/system/role/${id}/permissions`, { signal })
  },

  /** 保存角色权限码集合；分组伪权限码由后端过滤。 */
  async saveRolePermissions(id: string, payload: SaveRolePermissionsPayload): Promise<null> {
    return request<null>(`/system/role/${id}/permissions`, { method: 'PUT', data: payload })
  },

  /** 拥有该角色的用户列表（角色权限配置页右侧卡片展示）。 */
  async getRoleUsers(id: string, signal?: AbortSignal): Promise<UserRecord[]> {
    return request<UserRecord[]>(`/system/role/${id}/users`, { signal })
  },
}
