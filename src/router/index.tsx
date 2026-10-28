import { Suspense, lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RouteFallback } from '@/components/feedback/RouteFallback'
import {
  leafRouteKeys,
  portalLeafRouteKeys,
  routeMeta,
  LOGIN_PATH,
  PROFILE_PATH,
  type LeafRouteKey,
  type PortalLeafRouteKey,
} from '@/config/routes'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { RequirePermission } from '@/features/auth/components/RequirePermission'
import { RequireUserType } from '@/features/auth/components/RequireUserType'
import { getMenuPermissionCode } from '@/features/auth/utils/permissions'
import { homePathForUser } from '@/features/auth/utils/homePath'
import AppLayout from '@/layouts/AppLayout'
import SupplierPortalLayout from '@/layouts/SupplierPortalLayout'
import PlaceholderPage from '@/pages/PlaceholderPage'
import { useAuthStore } from '@/stores/authStore'

// 首页工作台单独懒加载，减少首屏主包体积。
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
// 登录页在壳层之外独立渲染（无侧边栏/顶栏），同样走懒加载。
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
// 个人中心在壳层内，但只从顶栏头像下拉进入，不占用侧边栏菜单。
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))

/**
 * 叶子路由 key -> 懒加载页面组件的注册表（内部端 + 门户端统一注册）。
 *
 * 使用 `satisfies` 交集约束强制覆盖两组叶子 key：
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
} satisfies Record<LeafRouteKey | PortalLeafRouteKey, LazyExoticComponent<ComponentType>>

/** 根路径重定向：按登录用户类型分流到管理端工作台 / 供应商门户首页。 */
function RootRedirect() {
  const currentUser = useAuthStore((state) => state.currentUser)
  return <Navigate to={homePathForUser(currentUser?.userType ?? 'staff')} replace />
}

/**
 * 应用路由表：
 * - /login 独立于壳层渲染；
 * - 内部管理端页面嵌套在 AppLayout 内，由 RequireAuth + RequireUserType(staff)
 *   依次兜住「未登录」与「供应商误入」；
 * - 供应商门户页面嵌套在 SupplierPortalLayout 内，对称地要求 supplier 类型；
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
      {/* ── 内部管理端 ──────────────────────────────────────────────── */}
      <Route
        element={
          <RequireAuth>
            <RequireUserType userType="staff">
              <AppLayout />
            </RequireUserType>
          </RequireAuth>
        }
      >
        {/* 根路径按用户类型重定向，保证直接访问 "/" 也能落到所属端首页。 */}
        <Route path="/" element={<RootRedirect />} />
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
      {/* ── 供应商门户（浅色顶部导航壳层，仅供应商类型用户可访问）────────── */}
      <Route
        element={
          <RequireAuth>
            <RequireUserType userType="supplier">
              <SupplierPortalLayout />
            </RequireUserType>
          </RequireAuth>
        }
      >
        {portalLeafRouteKeys.map((key) => {
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
        {/* 门户内的未知路径单独兜底（显式前缀优先级高于内部 404 的通配），引导回门户。 */}
        <Route
          path="supplier-portal/*"
          element={
            <PlaceholderPage title="页面不存在" description="请从顶部导航选择一个有效的功能页面。" module="404" />
          }
        />
      </Route>
    </Routes>
  )
}
