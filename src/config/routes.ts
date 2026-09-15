export interface RouteMeta {
  path: string
  title: string
  description: string
  module: string
}

/** 路由、侧边栏导航和页面壳层共用的路由元数据。 */
export const routeMeta = {
  dashboard: {
    path: '/dashboard',
    title: '工作台',
    description: '欢迎回来，管理员。这里是今天的经营概览。',
    module: 'dashboard',
  },
  inventory: {
    path: '/inventory',
    title: '库存总览',
    description: '实时掌握各仓库库存数量与周转情况。',
    module: 'inventory',
  },
  inventoryRecords: {
    path: '/inventory/records',
    title: '出入库记录',
    description: '追踪每一笔入库、出库和调拨流水。',
    module: 'inventory',
  },
  products: {
    path: '/products',
    title: '商品管理',
    description: '维护商品档案、分类、规格和库存上下限。',
    module: 'products',
  },
  sales: { path: '/sales', title: '销售订单', description: '管理销售订单及发货状态。', module: 'sales' },
  purchases: {
    path: '/purchases',
    title: '采购订单',
    description: '管理采购计划、供应商与到货进度。',
    module: 'purchases',
  },
  settings: { path: '/settings', title: '系统设置', description: '配置组织、角色权限和基础参数。', module: 'settings' },
} as const satisfies Record<string, RouteMeta>

export const placeholderRoutes = [
  routeMeta.inventory,
  routeMeta.inventoryRecords,
  routeMeta.products,
  routeMeta.sales,
  routeMeta.purchases,
  routeMeta.settings,
] as const
