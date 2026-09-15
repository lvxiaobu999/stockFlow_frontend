export interface InventoryAlert {
  id: string
  name: string
  sku: string
  stock: number
  safeStock: number
}

export interface DashboardSummary {
  productCount: number
  inventoryValue: number
  monthlySales: number
  pendingOrders: number
  salesTarget: number
  inventoryAlerts: InventoryAlert[]
  updatedAt: string
}
