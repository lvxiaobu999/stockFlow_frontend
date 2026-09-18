import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 对账列表页面（占位）：后续业务逻辑放在 features/reconciliation。 */
export default function ReconciliationListPage() {
  return <PlaceholderPage {...routeMeta.reconciliationList} />
}
