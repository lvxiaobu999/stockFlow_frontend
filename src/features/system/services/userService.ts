import type {
  CreateUserPayload,
  EnableStatus,
  StaffOption,
  UpdateUserPayload,
  UserListParams,
  UserRecord,
} from '@/features/system/types'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/** 用户管理服务：账号只停用不删除；登录账号创建后不可修改（更新载荷不含 username）。 */
export const userService = {
  /** 内部员工下拉选项（仓库负责人等引用场景）：仅启用账号。 */
  async getStaffOptions(signal?: AbortSignal): Promise<StaffOption[]> {
    return request<StaffOption[]>('/system/user/staff-options', { signal })
  },

  /** 分页查询用户；返回结构遵循 PaginatedData 约定（total 为总页数）。 */
  async getPage(params: UserListParams, signal?: AbortSignal): Promise<PaginatedData<UserRecord>> {
    return request<PaginatedData<UserRecord>>('/system/user/page', { params, signal })
  },

  /** 新建用户；登录账号重复时后端返回业务码 4002。password 省略表示使用系统默认密码。 */
  async create(payload: CreateUserPayload): Promise<UserRecord> {
    return request<UserRecord>('/system/user', { method: 'POST', data: payload })
  },

  /** 编辑用户资料与角色；登录账号不可修改。 */
  async update(id: string, payload: UpdateUserPayload): Promise<UserRecord> {
    return request<UserRecord>(`/system/user/${id}`, { method: 'PUT', data: payload })
  },

  /** 重置密码；password 省略时重置为系统默认密码 Zq@20260920。 */
  async resetPassword(id: string, password?: string): Promise<null> {
    return request<null>(`/system/user/${id}/password`, { method: 'PUT', data: { password } })
  },

  /** 启用 / 停用用户；内置 admin 不允许停用（后端业务码 4004）。 */
  async toggleStatus(id: string, status: EnableStatus): Promise<UserRecord> {
    return request<UserRecord>(`/system/user/${id}/status`, { method: 'PUT', data: { status } })
  },
}
