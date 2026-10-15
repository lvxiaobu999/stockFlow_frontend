import { useMemo } from 'react'
import { hasAnyPermission, hasPermission } from '@/features/auth/utils/permissions'
import { useAuthStore } from '@/stores/authStore'

export interface PermissionsApi {
  /** 是否拥有某个权限码（'*' 通配全部通过）。 */
  has: (code: string) => boolean
  /** 是否拥有任意一个权限码，用于「多选一」的显隐判断。 */
  hasAny: (codes: string[]) => boolean
}

/** 读取当前会话的权限码集合并返回稳定的判断函数，供菜单过滤与按钮显隐使用。 */
export function usePermissions(): PermissionsApi {
  const permissions = useAuthStore((state) => state.permissions)
  return useMemo(
    () => ({
      has: (code: string) => hasPermission(permissions, code),
      hasAny: (codes: string[]) => hasAnyPermission(permissions, codes),
    }),
    [permissions],
  )
}
