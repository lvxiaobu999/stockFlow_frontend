import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RouteFallback } from '@/components/feedback/RouteFallback'
import { placeholderRoutes, routeMeta } from '@/config/routes'
import AppLayout from '@/layouts/AppLayout'
import PlaceholderPage from '@/pages/PlaceholderPage'

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to={routeMeta.dashboard.path} replace />} />
        <Route
          path={routeMeta.dashboard.path}
          element={
            <Suspense fallback={<RouteFallback />}>
              <DashboardPage />
            </Suspense>
          }
        />
        {placeholderRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={<PlaceholderPage {...route} />} />
        ))}
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
