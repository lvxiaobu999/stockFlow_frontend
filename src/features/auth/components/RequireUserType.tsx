import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { homePathForUser } from '@/features/auth/utils/homePath'
import type { UserType } from '@/features/auth/types'

interface RequireUserTypeProps {
  /** 允许访问的用户类型（staff=内部员工 / supplier=供应商）。 */
  userType: UserType
  children: ReactNode
}

/**
 * 用户类型守卫：认证守卫（RequireAuth）之后使用，兜住「已登录但进错端」的场景。
 * 供应商账号直接输入管理端 URL、或内部员工访问门户路由时，
 * 重定向到其所属端的首页（而非展示 403 页），避免出现空壳布局。
 * 布局路由级守卫只做类型分流；页面级按钮 / 数据权限仍由菜单码与按钮码控制。
 */
export function RequireUserType({ userType, children }: RequireUserTypeProps) {
  const currentUser = useAuthStore((state) => state.currentUser)
  // 会话恢复完成后才会挂载到路由树（RequireAuth 已兜底），此处 currentUser 必然存在；
  // 理论空档（如极端时序）按「不允许」处理，重定向到该用户类型的首页。
  const allowed = currentUser?.userType === userType
  if (!allowed) {
    return <Navigate to={homePathForUser(currentUser?.userType ?? 'staff')} replace />
  }
  return children
}
