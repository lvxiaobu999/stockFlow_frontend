import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 待对账单据池页面（占位）：后续业务逻辑放在 features/reconciliation。 */
export default function PendingPoolPage() {
  return <PlaceholderPage {...routeMeta.reconciliationPendingPool} />
}
