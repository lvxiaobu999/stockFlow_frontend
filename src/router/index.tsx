import { Suspense, lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RouteFallback } from '@/components/feedback/RouteFallback'
import { leafRouteKeys, routeMeta, type LeafRouteKey } from '@/config/routes'
import AppLayout from '@/layouts/AppLayout'
import PlaceholderPage from '@/pages/PlaceholderPage'

// 首页工作台单独懒加载，减少首屏主包体积。
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))

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
        {/* 其余叶子路由统一由 leafRouteKeys 驱动生成，逐条注册对应懒加载页面。 */}
        {leafRouteKeys.map((key) => {
          const meta = routeMeta[key]
          const Page = pageComponents[key]
          return (
            <Route
              key={meta.path}
              path={meta.path}
              element={
                <Suspense fallback={<RouteFallback />}>
                  <Page />
                </Suspense>
              }
            />
          )
        })}
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
