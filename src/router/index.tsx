import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RouteFallback } from '@/components/feedback/RouteFallback'
import { placeholderRoutes, routeMeta } from '@/config/routes'
import AppLayout from '@/layouts/AppLayout'
import PlaceholderPage from '@/pages/PlaceholderPage'

// 首页工作台按需加载，减少首屏主包体积；其它重页面后续同样采用懒加载。
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))

/** 应用路由表：所有页面都嵌套在 AppLayout 壳层内，共享侧边栏与顶栏。 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* 根路径重定向到工作台，保证直接访问 "/" 也能落到首页。 */}
        <Route path="/" element={<Navigate to={routeMeta.dashboard.path} replace />} />
        <Route
          path={routeMeta.dashboard.path}
          element={
            <Suspense fallback={<RouteFallback />}>
              <DashboardPage />
            </Suspense>
          }
        />
        {/* 尚未实现的模块统一渲染占位页，避免路由树里出现空白页面。 */}
        {placeholderRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={<PlaceholderPage {...route} />} />
        ))}
        {/* 兜底 404，避免未知路径报错。 */}
        <Route
          path="*"
          element={
            <PlaceholderPage title="页面不存在" description="请从左侧菜单选择一个有效的功能页面。" module="404" />
          }
        />
      </Route>
    </Routes>
  )
}
