/** 库存预警项：当前库存低于安全库存的商品。 */
export interface InventoryAlert {
  id: string
  /** 商品名称。 */
  name: string
  /** 商品 SKU 编码。 */
  sku: string
  /** 当前库存数量。 */
  stock: number
  /** 安全库存下限，低于该值触发预警。 */
  safeStock: number
}

/** 工作台汇总数据，由 /dashboard/summary 接口返回。 */
export interface DashboardSummary {
  /** 商品总数，单位为件。 */
  productCount: number
  /** 库存总值，单位为万元。 */
  inventoryValue: number
  /** 本月销售额，单位为万元。 */
  monthlySales: number
  /** 待处理订单数量。 */
  pendingOrders: number
  /** 本月销售目标，单位为万元，用于计算目标完成度。 */
  salesTarget: number
  /** 需要关注的库存预警商品列表。 */
  inventoryAlerts: InventoryAlert[]
  /** 数据最后更新时间，展示为「数据更新于 HH:mm」。 */
  updatedAt: string
}
