import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 我的采购订单页面（占位）：后续业务逻辑放在 features/supplier-portal。 */
export default function MyOrdersPage() {
  return <PlaceholderPage {...routeMeta.supplierPortalMyOrders} />
}
