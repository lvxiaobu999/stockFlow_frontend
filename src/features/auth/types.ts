/**
 * 认证与會话（auth）领域类型定义。
 *
 * 登录采用 Cookie 会话：前端不保存任何凭证，刷新页面通过 /auth/me 恢复会话；
 * 当前用户是「用户档案」在会话中的投影，完整档案见 features/system/types.ts。
 */

import type { UserType } from '@/features/system/types'

// 用户类型由 system 领域统一定义（用户档案的归属方），这里原样重导出供会话相关代码使用。
export type { UserType }

/** 当前登录用户：/auth/login 与 /auth/me 返回的用户信息。 */
export interface CurrentUser {
  id: string
  /** 登录账号，创建后不可修改。 */
  username: string
  /** 姓名（展示名），顶栏与个人中心使用。 */
  name: string
  phone: string
  email?: string
  /** 所属部门；MVP 阶段为纯文本字段。 */
  department?: string
  userType: UserType
  /** 拥有的角色编码集合（用户与角色多对多）。 */
  roles: string[]
  /** 与 roles 一一对应的角色名称，供个人中心标签直接展示。 */
  roleNames: string[]
  /** 最后登录时间（ISO 字符串）。 */
  lastLoginAt?: string
  /** 最后登录 IP，个人中心「账号与安全」展示。 */
  lastLoginIp?: string
}

/** 登录成功或会话恢复时返回的完整会话：用户信息 + 权限码集合。 */
export interface AuthSession {
  user: CurrentUser
  /**
   * 权限码集合：菜单码（menu:xxx）控制侧边栏与路由访问，
   * 按钮码（域:实体:动作）控制页面内按钮显隐；含 '*' 表示全部权限（内置管理员）。
   */
  permissions: string[]
}

/** 登录表单载荷。 */
export interface LoginPayload {
  username: string
  password: string
}

/** 修改基本资料载荷（账号不可修改，走 PUT /auth/profile）。 */
export interface UpdateProfilePayload {
  name: string
  phone: string
  email?: string
}

/** 修改密码载荷；新密码规则 8-20 位且同时包含字母与数字。 */
export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}
