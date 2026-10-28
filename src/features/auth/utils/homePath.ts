import { routeMeta } from '@/config/routes'
import type { UserType } from '@/features/auth/types'

/**
 * 按用户类型推导登录后的落地页：
 * - 供应商账号落到供应商门户首页（需求：共用账号体系，按角色跳转）；
 * - 内部员工落到管理端工作台。
 * 登录成功跳转、登录页已登录重定向与根路径重定向共用，保证三处口径一致。
 */
export function homePathForUser(userType: UserType): string {
  return userType === 'supplier' ? routeMeta.supplierPortalHome.path : routeMeta.dashboard.path
}
