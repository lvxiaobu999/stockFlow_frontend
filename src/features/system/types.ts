/**
 * 系统管理（system）领域类型定义。
 *
 * 覆盖用户、角色、权限树与操作日志四块实体；字段与后端表结构对齐
 * （详见需求文档《00-系统管理/数据库设计》），分页复用 httpClient 的 PaginatedData。
 */

/** 用户类型：staff 为内部员工，supplier 为供应商账号（登录后应进入供应商门户）。 */
export type UserType = 'staff' | 'supplier'

// 启用状态（EnableStatus）为跨领域基础类型，真身在 @/types/common；
// 此处保留 re-export，既有 `@/features/system/types` 的导入无需改动。
import type { EnableStatus } from '@/types/common'

export type { EnableStatus }

/** 角色简要信息，用于用户表格的角色标签与表单回显。 */
export interface RoleBrief {
  /** 角色编码，如 admin、purchaser。 */
  code: string
  /** 角色名称，如 管理员。 */
  name: string
}

/** 用户档案（/system/user 系列接口的实体）。用户只停用、不物理删除。 */
export interface UserRecord {
  id: string
  /** 登录账号，仅字母、数字与下划线，创建后不可修改。 */
  username: string
  /** 姓名（真实姓名）。 */
  name: string
  /** 手机号，11 位；列表展示时需脱敏。 */
  phone: string
  email?: string
  /** 所属部门；MVP 阶段为纯文本字段，没有部门表。 */
  department?: string
  userType: UserType
  /** 拥有的角色（多对多），表单与表格共用。 */
  roles: RoleBrief[]
  /** 1=启用 0=停用；停用用户不能登录，且不能再被新单据引用。 */
  status: EnableStatus
  /** 内置账号标记：admin 不允许停用，前后端双重保护。 */
  builtin?: boolean
  remark?: string
  /** 最后登录时间（ISO 字符串）。 */
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

/** 用户列表查询参数（POST /system/user/page 均为可选过滤 + 分页）。 */
export interface UserListParams {
  /** 关键字，模糊匹配姓名 / 账号 / 手机号。 */
  keyword?: string
  status?: EnableStatus
  /** 按角色编码过滤。 */
  roleCode?: string
  userType?: UserType
  current: number
  pageSize: number
}

/** 新建用户表单载荷；password 省略时由后端生成默认密码 Zq@20260920。 */
export interface CreateUserPayload {
  username: string
  name: string
  phone: string
  email?: string
  department?: string
  userType: UserType
  roleCodes: string[]
  status: EnableStatus
  password?: string
  remark?: string
}

/** 编辑用户载荷：登录账号与初始密码不可修改。 */
export type UpdateUserPayload = Omit<CreateUserPayload, 'username' | 'password'>

/** 角色档案。MVP 固定 6 个内置角色，编码创建后不可修改。 */
export interface RoleRecord {
  id: string
  /** 角色编码，如 admin、purchaser，唯一。 */
  code: string
  /** 角色名称，如 采购员。 */
  name: string
  description?: string
  /** 拥有该角色的用户数量，列表右对齐列与角色详情卡共用。 */
  userCount: number
  status: EnableStatus
  /** 内置角色标记：admin / supplier 不允许停用。 */
  builtin?: boolean
  updatedAt: string
}

/** 角色列表查询参数。 */
export interface RoleListParams {
  /** 按角色名称模糊匹配。 */
  name?: string
  status?: EnableStatus
  current: number
  pageSize: number
}

/** 新建角色载荷；编码需唯一且仅字母数字。 */
export interface CreateRolePayload {
  code: string
  name: string
  description?: string
}

/** 编辑角色载荷：编码不可修改。 */
export type UpdateRolePayload = Omit<CreateRolePayload, 'code'>

/**
 * 权限树节点。key 即权限码：
 * - 菜单节点：menu:<路径段以:连接>，如 menu:system:user，勾选代表可访问该页面；
 * - 按钮节点：<域>:<实体>:<动作>，如 system:user:create，控制页面内按钮显隐。
 */
export interface PermissionNode {
  key: string
  title: string
  type: 'menu' | 'button'
  children?: PermissionNode[]
}

/** 保存角色权限载荷。保存后「下次登录生效」，不热更新在线会话。 */
export interface SaveRolePermissionsPayload {
  permissionCodes: string[]
}

/** 操作日志记录：只读审计数据，保留 180 天，不提供任何写接口。 */
export interface OperationLogRecord {
  id: string
  /** 操作发生时间（ISO 字符串），列表展示到秒。 */
  operatedAt: string
  /** 操作人姓名（登录失败时可能为未知账号）。 */
  operator: string
  /** 模块编码，如 system、purchase。 */
  module: string
  /** 模块展示名，如 系统管理。 */
  moduleName: string
  /** 动作名，如 新建用户、登录失败。 */
  action: string
  /** 对象摘要，如 账号 zhangwei（张伟）。 */
  targetSummary: string
  ip: string
  /** true=成功（绿色） false=失败（红色）。 */
  success: boolean
}

/** 操作日志列表查询参数。 */
export interface OperationLogListParams {
  /** 按操作人精确匹配。 */
  operator?: string
  /** 按模块编码过滤。 */
  module?: string
  /** 时间范围（含），ISO 字符串。 */
  startTime?: string
  endTime?: string
  /** 关键字，模糊匹配对象摘要 / IP / 动作。 */
  keyword?: string
  current: number
  pageSize: number
}

/** 操作日志筛选下拉选项（/system/operation-log/options 返回）。 */
export interface LogFilterOptions {
  /** 操作人姓名去重列表。 */
  operators: string[]
  /** 模块选项，value 为模块编码。 */
  modules: { value: string; label: string }[]
}

/** 内部员工下拉选项（/system/user/staff-options 返回），仓库负责人等引用场景使用。 */
export interface StaffOption {
  id: string
  name: string
  /** 部门，辅助辨识同名员工。 */
  department?: string
}
