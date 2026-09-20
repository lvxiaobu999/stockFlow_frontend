import {
  AuditOutlined,
  BarChartOutlined,
  CarryOutOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  PayCircleOutlined,
  ReconciliationOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import { routeMeta } from '@/config/routes'

export interface NavigationItem {
  /** 菜单唯一标识；有子菜单时作为分组 key，没有子菜单时通常等于 path。 */
  key: string
  /** 菜单显示文案。 */
  label: string
  /** 叶子菜单的跳转路径；有子菜单的父级可以省略。 */
  path?: string
  /** 菜单图标，仅一级菜单需要。 */
  icon?: ReactNode
  /** 子菜单，递归复用本类型。 */
  children?: NavigationItem[]
}

/**
 * 侧边栏标题、路径和分组的唯一配置来源。
 *
 * 分组 key 与叶子 path 分别来自各业务域的约定：叶子项一律使用 routeMeta 中的
 * path 作为 key，保证与路由表一一对应；分组 key 使用业务域英文名（如 system）。
 */
export const navigationItems: NavigationItem[] = [
  // 首页是顶部一级入口，不归入任何分组。
  {
    key: routeMeta.dashboard.path,
    label: routeMeta.dashboard.title,
    path: routeMeta.dashboard.path,
    icon: <DashboardOutlined />,
  },
  // 01 库存管理
  {
    key: 'inventory',
    label: '库存管理',
    icon: <DatabaseOutlined />,
    children: [
      { key: routeMeta.warehouse.path, label: routeMeta.warehouse.title, path: routeMeta.warehouse.path },
      { key: routeMeta.currentStock.path, label: routeMeta.currentStock.title, path: routeMeta.currentStock.path },
      {
        key: routeMeta.stockTransactions.path,
        label: routeMeta.stockTransactions.title,
        path: routeMeta.stockTransactions.path,
      },
      { key: routeMeta.stockAlert.path, label: routeMeta.stockAlert.title, path: routeMeta.stockAlert.path },
    ],
  },
  // 02 商品管理
  {
    key: 'product',
    label: '商品管理',
    icon: <TagsOutlined />,
    children: [
      {
        key: routeMeta.productCategory.path,
        label: routeMeta.productCategory.title,
        path: routeMeta.productCategory.path,
      },
      { key: routeMeta.productList.path, label: routeMeta.productList.title, path: routeMeta.productList.path },
    ],
  },
  // 03 采购管理
  {
    key: 'purchase',
    label: '采购管理',
    icon: <ShoppingOutlined />,
    children: [
      {
        key: routeMeta.purchaseRequest.path,
        label: routeMeta.purchaseRequest.title,
        path: routeMeta.purchaseRequest.path,
      },
      { key: routeMeta.purchaseOrder.path, label: routeMeta.purchaseOrder.title, path: routeMeta.purchaseOrder.path },
    ],
  },
  // 04 供应商端（后续需要独立登录，当前先作为普通菜单接入）
  {
    key: 'supplier-portal',
    label: '供应商端',
    icon: <ShopOutlined />,
    children: [
      {
        key: routeMeta.supplierPortalHome.path,
        label: routeMeta.supplierPortalHome.title,
        path: routeMeta.supplierPortalHome.path,
      },
      {
        key: routeMeta.supplierPortalMyOrders.path,
        label: routeMeta.supplierPortalMyOrders.title,
        path: routeMeta.supplierPortalMyOrders.path,
      },
      {
        key: routeMeta.supplierPortalToShip.path,
        label: routeMeta.supplierPortalToShip.title,
        path: routeMeta.supplierPortalToShip.path,
      },
      {
        key: routeMeta.supplierPortalShipments.path,
        label: routeMeta.supplierPortalShipments.title,
        path: routeMeta.supplierPortalShipments.path,
      },
    ],
  },
  // 05 审批中心
  {
    key: 'approval',
    label: '审批中心',
    icon: <AuditOutlined />,
    children: [
      {
        key: routeMeta.approvalPending.path,
        label: routeMeta.approvalPending.title,
        path: routeMeta.approvalPending.path,
      },
      {
        key: routeMeta.approvalProcessed.path,
        label: routeMeta.approvalProcessed.title,
        path: routeMeta.approvalProcessed.path,
      },
    ],
  },
  // 06 对账管理
  {
    key: 'reconciliation',
    label: '对账管理',
    icon: <ReconciliationOutlined />,
    children: [
      {
        key: routeMeta.reconciliationList.path,
        label: routeMeta.reconciliationList.title,
        path: routeMeta.reconciliationList.path,
      },
      {
        key: routeMeta.reconciliationPendingPool.path,
        label: routeMeta.reconciliationPendingPool.title,
        path: routeMeta.reconciliationPendingPool.path,
      },
      {
        key: routeMeta.reconciliationOverview.path,
        label: routeMeta.reconciliationOverview.title,
        path: routeMeta.reconciliationOverview.path,
      },
    ],
  },
  // 07 供应商管理
  {
    key: 'supplier',
    label: '供应商管理',
    icon: <TeamOutlined />,
    children: [
      { key: routeMeta.supplierList.path, label: routeMeta.supplierList.title, path: routeMeta.supplierList.path },
    ],
  },
  // 08 付款管理
  {
    key: 'payment',
    label: '付款管理',
    icon: <PayCircleOutlined />,
    children: [
      {
        key: routeMeta.paymentPending.path,
        label: routeMeta.paymentPending.title,
        path: routeMeta.paymentPending.path,
      },
      {
        key: routeMeta.paymentRecords.path,
        label: routeMeta.paymentRecords.title,
        path: routeMeta.paymentRecords.path,
      },
    ],
  },
  // 09 报表中心
  {
    key: 'report',
    label: '报表中心',
    icon: <BarChartOutlined />,
    children: [
      {
        key: routeMeta.reportDashboard.path,
        label: routeMeta.reportDashboard.title,
        path: routeMeta.reportDashboard.path,
      },
      {
        key: routeMeta.reportPurchaseSummary.path,
        label: routeMeta.reportPurchaseSummary.title,
        path: routeMeta.reportPurchaseSummary.path,
      },
      {
        key: routeMeta.reportPurchaseDetail.path,
        label: routeMeta.reportPurchaseDetail.title,
        path: routeMeta.reportPurchaseDetail.path,
      },
      {
        key: routeMeta.reportSupplierAnalysis.path,
        label: routeMeta.reportSupplierAnalysis.title,
        path: routeMeta.reportSupplierAnalysis.path,
      },
      {
        key: routeMeta.reportInventorySummary.path,
        label: routeMeta.reportInventorySummary.title,
        path: routeMeta.reportInventorySummary.path,
      },
      {
        key: routeMeta.reportStockTransactions.path,
        label: routeMeta.reportStockTransactions.title,
        path: routeMeta.reportStockTransactions.path,
      },
      {
        key: routeMeta.reportStockAlert.path,
        label: routeMeta.reportStockAlert.title,
        path: routeMeta.reportStockAlert.path,
      },
      { key: routeMeta.reportPayable.path, label: routeMeta.reportPayable.title, path: routeMeta.reportPayable.path },
    ],
  },
  // 10 收货与验收
  {
    key: 'receiving',
    label: '收货与验收',
    icon: <CarryOutOutlined />,
    children: [
      {
        key: routeMeta.receivingReceipt.path,
        label: routeMeta.receivingReceipt.title,
        path: routeMeta.receivingReceipt.path,
      },
      {
        key: routeMeta.receivingInspection.path,
        label: routeMeta.receivingInspection.title,
        path: routeMeta.receivingInspection.path,
      },
    ],
  },
  // 00 系统管理
  {
    key: 'system',
    label: '系统管理',
    icon: <SettingOutlined />,
    children: [
      { key: routeMeta.systemUser.path, label: routeMeta.systemUser.title, path: routeMeta.systemUser.path },
      { key: routeMeta.systemRole.path, label: routeMeta.systemRole.title, path: routeMeta.systemRole.path },
      {
        key: routeMeta.systemOperationLog.path,
        label: routeMeta.systemOperationLog.title,
        path: routeMeta.systemOperationLog.path,
      },
    ],
  },
]

/** 按路径在导航配置中查找匹配项（含二级子项），用于页面标题等反查场景。 */
export function findNavigationItem(path: string): NavigationItem | undefined {
  for (const item of navigationItems) {
    if (item.path === path) return item
    // 一级未命中时再向下查找子菜单，避免遗漏分组内的叶子项。
    const child = item.children?.find((nestedItem) => nestedItem.path === path)
    if (child) return child
  }
  return undefined
}

/** 根据当前路径反查所属的一级菜单 key，用于侧边栏初始展开对应分组。 */
export function getNavigationParentKey(path: string): string | undefined {
  for (const item of navigationItems) {
    // 一级叶子（工作台）没有分组，无需展开。
    if (item.path === path) return undefined
    if (item.children?.some((child) => child.path === path)) return item.key
  }
  return undefined
}
