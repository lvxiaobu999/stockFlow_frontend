import type { ReactNode } from 'react'
import { Alert, Button, Spin } from 'antd'
import { Navigate, useLocation } from 'react-router-dom'
import { LOGIN_PATH } from '@/config/routes'
import { useAuthSession } from '@/features/auth/hooks/useAuthSession'

interface RequireAuthProps {
  /** 受保护的布局内容（AppLayout），由调用方以 children 形式传入。 */
  children: ReactNode
}

/**
 * 认证守卫：包裹 AppLayout 布局路由，未登录跳转登录页并记录来源路径。
 *
 * 会话恢复采用组件式守卫（与 useQuery 模板同构，仓库不使用 router loader）：
 * 应用挂载时 /auth/me 尚在请求中，先渲染全屏 splash 避免闪烁登录页；
 * 401 属「未登录」正常分支直接重定向，其余错误（网络异常等）给出重试入口
 * 而不是误踢回登录页。
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading, error, refetch } = useAuthSession()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="route-fallback" role="status" aria-label="正在恢复登录状态">
        <Spin size="large" />
      </div>
    )
  }

  // 非 401 的恢复失败（如后端不可达）提供显式重试，避免用户被误判为未登录。
  if (error) {
    return (
      <div className="route-fallback">
        <Alert
          type="error"
          showIcon
          message="登录状态恢复失败"
          description="无法确认当前登录状态，请检查网络后重试。"
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      </div>
    )
  }

  if (!isAuthenticated) {
    // 记录来源路径，登录成功后由 useLogin 跳回原页面。
    return <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />
  }

  return children
}
