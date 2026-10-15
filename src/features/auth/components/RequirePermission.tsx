import type { ReactNode } from 'react'
import { Result } from 'antd'
import { usePermissions } from '@/features/auth/hooks/usePermissions'

interface RequirePermissionProps {
  /** 访问该页面所需的菜单权限码，一般用 getMenuPermissionCode(path) 推导。 */
  code: string
  children: ReactNode
}

/**
 * 页面级权限守卫：无权限时渲染 403 结果页，而不是隐藏整条路由。
 *
 * 用于兜住「用户直接输入 URL」绕过侧边栏过滤的场景；admin 持有 '*'
 * 通配码，所有页面直接放行。
 */
export function RequirePermission({ code, children }: RequirePermissionProps) {
  const { has } = usePermissions()

  if (!has(code)) {
    return (
      <Result
        status="403"
        title="没有访问权限"
        subTitle="当前账号未被授权访问该页面，请联系管理员分配角色权限。权限变更将在下次登录后生效。"
      />
    )
  }

  return children
}
