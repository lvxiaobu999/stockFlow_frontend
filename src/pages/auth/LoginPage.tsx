import { Navigate } from 'react-router-dom'
import { appEnv } from '@/config/env'
import { routeMeta } from '@/config/routes'
import { LoginBrandPanel } from '@/features/auth/components/LoginBrandPanel'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuthSession } from '@/features/auth/hooks/useAuthSession'

/**
 * 登录页（布局外独立渲染）：左侧品牌区 + 右侧登录卡。
 * 已登录用户直接回工作台，避免重复登录；未登录才展示表单。
 */
export default function LoginPage() {
  const { isAuthenticated } = useAuthSession()

  if (isAuthenticated) {
    return <Navigate to={routeMeta.dashboard.path} replace />
  }

  return (
    <div className="login-page">
      <LoginBrandPanel />
      <div className="login-panel">
        <div className="login-card">
          <div className="login-card-head">
            <div className="login-card-mark">S</div>
            <div>
              <h1 className="login-card-title">{appEnv.appName}</h1>
              <p className="login-card-subtitle">进销存管理系统 · 内部员工登录</p>
            </div>
          </div>
          <LoginForm />
        </div>
        <p className="login-footer">登录即代表同意公司信息安全管理规范</p>
      </div>
    </div>
  )
}
