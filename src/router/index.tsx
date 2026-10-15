import { Suspense, lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RouteFallback } from '@/components/feedback/RouteFallback'
import { leafRouteKeys, routeMeta, LOGIN_PATH, PROFILE_PATH, type LeafRouteKey } from '@/config/routes'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { RequirePermission } from '@/features/auth/components/RequirePermission'
import { getMenuPermissionCode } from '@/features/auth/utils/permissions'
import AppLayout from '@/layouts/AppLayout'
import PlaceholderPage from '@/pages/PlaceholderPage'

// 首页工作台单独懒加载，减少首屏主包体积。
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
// 登录页在壳层之外独立渲染（无侧边栏/顶栏），同样走懒加载。
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
// 个人中心在壳层内，但只从顶栏头像下拉进入，不占用侧边栏菜单。
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))

/**
 * 叶子路由 key -> 懒加载页面组件的注册表。
 *
 * 使用 `satisfies Record<LeafRouteKey, ...>` 强制覆盖所有叶子 key：
 * 在 routes.ts 新增叶子路由后，若漏写对应页面组件，会在编译期报错。
 */
const pageComponents = {
  systemUser: lazy(() => import('@/pages/system/UserManagementPage')),
  systemRole: lazy(() => import('@/pages/system/RoleManagementPage')),
  systemOperationLog: lazy(() => import('@/pages/system/OperationLogPage')),
  warehouse: lazy(() => import('@/pages/inventory/WarehouseListPage')),
  currentStock: lazy(() => import('@/pages/inventory/CurrentStockPage')),
  stockTransactions: lazy(() => import('@/pages/inventory/StockTransactionsPage')),
  stockAlert: lazy(() => import('@/pages/inventory/StockAlertPage')),
  productCategory: lazy(() => import('@/pages/product/CategoryPage')),
  productList: lazy(() => import('@/pages/product/ProductListPage')),
  purchaseRequest: lazy(() => import('@/pages/purchase/PurchaseRequestPage')),
  purchaseOrder: lazy(() => import('@/pages/purchase/PurchaseOrderPage')),
  supplierPortalHome: lazy(() => import('@/pages/supplier-portal/SupplierPortalHomePage')),
  supplierPortalMyOrders: lazy(() => import('@/pages/supplier-portal/MyOrdersPage')),
  supplierPortalToShip: lazy(() => import('@/pages/supplier-portal/ToShipPage')),
  supplierPortalShipments: lazy(() => import('@/pages/supplier-portal/ShipmentsPage')),
  approvalPending: lazy(() => import('@/pages/approval/PendingApprovalPage')),
  approvalProcessed: lazy(() => import('@/pages/approval/ProcessedApprovalPage')),
  reconciliationList: lazy(() => import('@/pages/reconciliation/ReconciliationListPage')),
  reconciliationPendingPool: lazy(() => import('@/pages/reconciliation/PendingPoolPage')),
  reconciliationOverview: lazy(() => import('@/pages/reconciliation/ReconciliationOverviewPage')),
  supplierList: lazy(() => import('@/pages/supplier/SupplierListPage')),
  paymentPending: lazy(() => import('@/pages/payment/PendingPaymentPage')),
  paymentRecords: lazy(() => import('@/pages/payment/PaymentRecordsPage')),
  reportDashboard: lazy(() => import('@/pages/report/ReportDashboardPage')),
  reportPurchaseSummary: lazy(() => import('@/pages/report/PurchaseSummaryReportPage')),
  reportPurchaseDetail: lazy(() => import('@/pages/report/PurchaseDetailReportPage')),
  reportSupplierAnalysis: lazy(() => import('@/pages/report/SupplierAnalysisReportPage')),
  reportInventorySummary: lazy(() => import('@/pages/report/InventorySummaryReportPage')),
  reportStockTransactions: lazy(() => import('@/pages/report/StockTransactionsReportPage')),
  reportStockAlert: lazy(() => import('@/pages/report/StockAlertReportPage')),
  reportPayable: lazy(() => import('@/pages/report/PayableReportPage')),
  receivingReceipt: lazy(() => import('@/pages/receiving/ReceiptPage')),
  receivingInspection: lazy(() => import('@/pages/receiving/InspectionPage')),
} satisfies Record<LeafRouteKey, LazyExoticComponent<ComponentType>>

/**
 * 应用路由表：
 * - /login 独立于壳层渲染；
 * - 其余页面嵌套在 AppLayout 内，整体由 RequireAuth 守卫认证态；
 * - 每个叶子页面再包一层 RequirePermission（菜单权限码由路径推导），
 *   兜住「直接输入 URL」的越权访问；404 兜底页不做权限控制。
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path={LOGIN_PATH}
        element={
          <Suspense fallback={<RouteFallback />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        {/* 根路径重定向到工作台，保证直接访问 "/" 也能落到首页。 */}
        <Route path="/" element={<Navigate to={routeMeta.dashboard.path} replace />} />
        <Route
          path={routeMeta.dashboard.path}
          element={
            <RequirePermission code={getMenuPermissionCode(routeMeta.dashboard.path)}>
              <Suspense fallback={<RouteFallback />}>
                <DashboardPage />
              </Suspense>
            </RequirePermission>
          }
        />
        {/* 其余叶子路由统一由 leafRouteKeys 驱动生成，逐条注册对应懒加载页面。 */}
        {leafRouteKeys.map((key) => {
          const meta = routeMeta[key]
          const Page = pageComponents[key]
          return (
            <Route
              key={meta.path}
              path={meta.path}
              element={
                <RequirePermission code={getMenuPermissionCode(meta.path)}>
                  <Suspense fallback={<RouteFallback />}>
                    <Page />
                  </Suspense>
                </RequirePermission>
              }
            />
          )
        })}
        {/* 个人中心：登录即可访问，不挂菜单权限码（PROFILE_PATH 不在侧边栏注册表内）。 */}
        <Route
          path={PROFILE_PATH}
          element={
            <Suspense fallback={<RouteFallback />}>
              <ProfilePage />
            </Suspense>
          }
        />
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
