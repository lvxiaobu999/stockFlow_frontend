export interface RouteMeta {
  /** 路由路径，同时作为侧边栏导航的跳转目标。 */
  path: string
  /** 页面标题与侧边栏菜单文案。 */
  title: string
  /** 页面副标题 / 用途说明，展示在占位页面中。 */
  description: string
  /** 业务模块标识，对应 src/features/<module> 目录。 */
  module: string
}

/**
 * 全量路由元数据（扁平结构）。
 *
 * 路由、侧边栏导航和页面壳层统一从这里读取，避免在多处重复维护字符串。
 * 一级菜单与二级菜单的分组关系由 config/navigation.tsx 描述，这里只记录叶子路由。
 */
export const routeMeta = {
  // ── 首页（顶部一级入口）──────────────────────────────────────────────
  dashboard: {
    path: '/dashboard',
    title: '工作台',
    description: '欢迎回来，管理员。这里是今天的经营概览。',
    module: 'dashboard',
  },

  // ── 00 系统管理 ──────────────────────────────────────────────────────
  systemUser: {
    path: '/system/user',
    title: '用户管理',
    description: '维护系统登录账号、分配角色与启用状态。',
    module: 'system',
  },
  systemRole: {
    path: '/system/role',
    title: '角色管理',
    description: '配置角色及其菜单和数据权限。',
    module: 'system',
  },
  systemOperationLog: {
    path: '/system/operation-log',
    title: '操作日志',
    description: '查询关键操作的审计记录（只读，保留 180 天）。',
    module: 'system',
  },

  // ── 01 库存管理 ──────────────────────────────────────────────────────
  warehouse: {
    path: '/inventory/warehouse',
    title: '仓库列表',
    description: '维护仓库档案与启用状态。',
    module: 'inventory',
  },
  currentStock: {
    path: '/inventory/current-stock',
    title: '当前库存',
    description: '按仓库 + 商品查看实时库存，支持库存调整与流水下钻。',
    module: 'inventory',
  },
  stockTransactions: {
    path: '/inventory/stock-transactions',
    title: '库存流水',
    description: '追踪每一笔入库、出库与调整流水（只增不改）。',
    module: 'inventory',
  },
  stockAlert: {
    path: '/inventory/stock-alert',
    title: '安全库存预警',
    description: '关注当前库存 ≤ 安全库存的商品，跳转采购补货。',
    module: 'inventory',
  },

  // ── 02 商品管理 ──────────────────────────────────────────────────────
  productCategory: {
    path: '/product/category',
    title: '商品分类',
    description: '维护商品分类层级。',
    module: 'product',
  },
  productList: {
    path: '/product/list',
    title: '商品列表',
    description: '维护商品档案、规格与库存上下限。',
    module: 'product',
  },

  // ── 03 采购管理 ──────────────────────────────────────────────────────
  purchaseRequest: {
    path: '/purchase/request',
    title: '采购申请',
    description: '提交并跟踪采购申请。',
    module: 'purchase',
  },
  purchaseOrder: {
    path: '/purchase/order',
    title: '采购订单',
    description: '管理采购订单与到货进度。',
    module: 'purchase',
  },

  // ── 04 供应商端（独立登录，暂作为普通菜单接入）───────────────────────
  supplierPortalHome: {
    path: '/supplier-portal/home',
    title: '首页',
    description: '供应商门户首页概览。',
    module: 'supplier-portal',
  },
  supplierPortalMyOrders: {
    path: '/supplier-portal/my-orders',
    title: '我的采购订单',
    description: '查看分配给我的采购订单。',
    module: 'supplier-portal',
  },
  supplierPortalToShip: {
    path: '/supplier-portal/to-ship',
    title: '待发货',
    description: '查看待发货的采购订单。',
    module: 'supplier-portal',
  },
  supplierPortalShipments: {
    path: '/supplier-portal/shipments',
    title: '发货记录',
    description: '查看已完成的发货记录。',
    module: 'supplier-portal',
  },

  // ── 05 审批中心 ──────────────────────────────────────────────────────
  approvalPending: {
    path: '/approval/pending',
    title: '我的审批',
    description: '处理待我审批的申请。',
    module: 'approval',
  },
  approvalProcessed: {
    path: '/approval/processed',
    title: '我已审批',
    description: '查看我已处理过的审批。',
    module: 'approval',
  },

  // ── 06 对账管理 ──────────────────────────────────────────────────────
  reconciliationList: {
    path: '/reconciliation/list',
    title: '对账列表',
    description: '按供应商与期间汇总已收货单据，跟踪确认、差异与关闭进度。',
    module: 'reconciliation',
  },
  reconciliationPendingPool: {
    path: '/reconciliation/pending-pool',
    title: '待对账单据池',
    description: '已收货未对账单据池，勾选同一供应商单据整单发起对账。',
    module: 'reconciliation',
  },
  reconciliationOverview: {
    path: '/reconciliation/overview',
    title: '对账汇总看板',
    description: '对账进度总览：待对账金额、本月已对账与待处理事项。',
    module: 'reconciliation',
  },

  // ── 07 供应商管理 ────────────────────────────────────────────────────
  supplierList: {
    path: '/supplier/list',
    title: '供应商列表',
    description: '维护供应商档案与合作状态。',
    module: 'supplier',
  },

  // ── 08 付款管理 ──────────────────────────────────────────────────────
  paymentPending: {
    path: '/payment/pending',
    title: '待付款订单',
    description: '查看待付款的订单。',
    module: 'payment',
  },
  paymentRecords: {
    path: '/payment/records',
    title: '付款记录',
    description: '查看付款记录与应付明细。',
    module: 'payment',
  },

  // ── 09 报表中心 ──────────────────────────────────────────────────────
  reportDashboard: {
    path: '/report/dashboard',
    title: '报表首页',
    description: '报表中心首页。',
    module: 'report',
  },
  reportPurchaseSummary: {
    path: '/report/purchase-summary',
    title: '采购汇总报表',
    description: '采购汇总报表。',
    module: 'report',
  },
  reportPurchaseDetail: {
    path: '/report/purchase-detail',
    title: '采购明细报表',
    description: '采购明细报表。',
    module: 'report',
  },
  reportSupplierAnalysis: {
    path: '/report/supplier-analysis',
    title: '供应商采购分析',
    description: '供应商采购分析报表。',
    module: 'report',
  },
  reportInventorySummary: {
    path: '/report/inventory-summary',
    title: '库存汇总报表',
    description: '库存汇总报表。',
    module: 'report',
  },
  reportStockTransactions: {
    path: '/report/stock-transactions',
    title: '库存流水报表',
    description: '库存流水报表。',
    module: 'report',
  },
  reportStockAlert: {
    path: '/report/stock-alert',
    title: '安全库存预警报表',
    description: '安全库存预警报表。',
    module: 'report',
  },
  reportPayable: {
    path: '/report/payable',
    title: '付款 / 应付报表',
    description: '付款 / 应付报表。',
    module: 'report',
  },

  // ── 10 收货与验收 ────────────────────────────────────────────────────
  receivingReceipt: {
    path: '/receiving/receipt',
    title: '收货单',
    description: '登记到货实收数量，跟踪待收货 / 已收货单据。',
    module: 'receiving',
  },
  receivingInspection: {
    path: '/receiving/inspection',
    title: '验收单',
    description: '提交合格 / 不合格结论，合格数量进入入库环节。',
    module: 'receiving',
  },
} as const satisfies Record<string, RouteMeta>

/**
 * 内部管理端的叶子路由 key（AppLayout 壳层内渲染）。
 * 供应商门户的路由单独拆到 portalLeafRouteKeys：两端壳层不同
 * （管理端深色侧边栏 / 门户顶部导航），且分别受用户类型守卫约束。
 */
export const leafRouteKeys = [
  // 00 系统管理
  'systemUser',
  'systemRole',
  'systemOperationLog',
  // 01 库存管理
  'warehouse',
  'currentStock',
  'stockTransactions',
  'stockAlert',
  // 02 商品管理
  'productCategory',
  'productList',
  // 03 采购管理
  'purchaseRequest',
  'purchaseOrder',
  // 05 审批中心
  'approvalPending',
  'approvalProcessed',
  // 06 对账管理
  'reconciliationList',
  'reconciliationPendingPool',
  'reconciliationOverview',
  // 07 供应商管理
  'supplierList',
  // 08 付款管理
  'paymentPending',
  'paymentRecords',
  // 09 报表中心
  'reportDashboard',
  'reportPurchaseSummary',
  'reportPurchaseDetail',
  'reportSupplierAnalysis',
  'reportInventorySummary',
  'reportStockTransactions',
  'reportStockAlert',
  'reportPayable',
  // 10 收货与验收
  'receivingReceipt',
  'receivingInspection',
] as const

/**
 * 供应商门户的叶子路由 key：挂在 SupplierPortalLayout 壳层下，
 * 仅供应商类型用户可访问（内部员工访问会被类型守卫重定向回工作台）。
 */
export const portalLeafRouteKeys = [
  'supplierPortalHome',
  'supplierPortalMyOrders',
  'supplierPortalToShip',
  'supplierPortalShipments',
] as const

/** 内部叶子路由 key 的联合类型，用于在注册表中做编译期完整性约束。 */
export type LeafRouteKey = (typeof leafRouteKeys)[number]
/** 门户叶子路由 key 的联合类型。 */
export type PortalLeafRouteKey = (typeof portalLeafRouteKeys)[number]

/**
 * 登录页路径。独立于 AppLayout 壳层渲染（无侧边栏/顶栏），也不进入
 * routeMeta 注册表——它不是侧边栏导航页，仅由路由守卫在未登录时跳入。
 */
export const LOGIN_PATH = '/login'

/**
 * 个人中心路径。位于壳层内，但只从顶栏头像下拉进入，不占用侧边栏菜单位，
 * 因此同样不进入 routeMeta / leafRouteKeys。
 */
export const PROFILE_PATH = '/profile'
