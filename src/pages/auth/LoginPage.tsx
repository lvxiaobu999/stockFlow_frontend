import { Navigate } from 'react-router-dom'
import { appEnv } from '@/config/env'
import { LoginBrandPanel } from '@/features/auth/components/LoginBrandPanel'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuthSession } from '@/features/auth/hooks/useAuthSession'
import { homePathForUser } from '@/features/auth/utils/homePath'
import { useAuthStore } from '@/stores/authStore'

/**
 * 登录页（布局外独立渲染）：左侧品牌区 + 右侧登录卡。
 * 账号体系对内部员工与供应商统一：已登录用户按用户类型回到所属端首页，
 * 未登录才展示表单；登录成功后的跳转分流在 useLogin 内处理。
 */
export default function LoginPage() {
  const { isAuthenticated } = useAuthSession()
  const currentUser = useAuthStore((state) => state.currentUser)

  if (isAuthenticated) {
    return <Navigate to={homePathForUser(currentUser?.userType ?? 'staff')} replace />
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
              <p className="login-card-subtitle">进销存管理系统 · 统一登录</p>
            </div>
          </div>
          <LoginForm />
        </div>
        <p className="login-footer">登录即代表同意公司信息安全管理规范</p>
      </div>
    </div>
  )
}
