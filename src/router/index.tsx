import { Spin } from 'antd'
import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'
import PlaceholderPage from '@/pages/PlaceholderPage'

// 页面级代码分割：较大的业务页面懒加载，占位页保持同步加载以简化首次渲染。
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))

function RouteFallback() {
  return (
    <div className="route-fallback">
      <Spin size="large" />
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<RouteFallback />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="/inventory"
          element={<PlaceholderPage title="库存总览" description="实时掌握各仓库库存数量与周转情况。" />}
        />
        <Route
          path="/inventory/records"
          element={<PlaceholderPage title="出入库记录" description="追踪每一笔入库、出库和调拨流水。" />}
        />
        <Route
          path="/products"
          element={<PlaceholderPage title="商品管理" description="维护商品档案、分类、规格和库存上下限。" />}
        />
        <Route
          path="/sales"
          element={<PlaceholderPage title="销售订单" description="管理销售订单及发货状态。" />}
        />
        <Route
          path="/purchases"
          element={<PlaceholderPage title="采购订单" description="管理采购计划、供应商与到货进度。" />}
        />
        <Route
          path="/settings"
          element={<PlaceholderPage title="系统设置" description="配置组织、角色权限和基础参数。" />}
        />
        <Route
          path="*"
          element={<PlaceholderPage title="页面不存在" description="请从左侧菜单选择一个有效的功能页面。" />}
        />
      </Route>
    </Routes>
  )
}
