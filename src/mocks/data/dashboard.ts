import type { DashboardSummary } from '@/features/dashboard/types'

export const dashboardMock: DashboardSummary = {
  productCount: 1284,
  inventoryValue: 386.4,
  monthlySales: 86.2,
  pendingOrders: 24,
  salesTarget: 120,
  updatedAt: '10:24',
  inventoryAlerts: [
    { id: '1', name: '无线蓝牙耳机 Pro', sku: 'SFK-10024', stock: 8, safeStock: 20 },
    { id: '2', name: '人体工学办公椅', sku: 'SFK-20017', stock: 12, safeStock: 15 },
    { id: '3', name: 'USB-C 多功能扩展坞', sku: 'SFK-30008', stock: 18, safeStock: 30 },
  ],
}
