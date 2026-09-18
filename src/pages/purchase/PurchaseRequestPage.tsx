import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 采购申请页面（占位）：后续业务逻辑放在 features/purchase。 */
export default function PurchaseRequestPage() {
  return <PlaceholderPage {...routeMeta.purchaseRequest} />
}
