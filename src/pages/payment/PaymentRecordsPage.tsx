import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 付款记录页面（占位）：后续业务逻辑放在 features/payment。 */
export default function PaymentRecordsPage() {
  return <PlaceholderPage {...routeMeta.paymentRecords} />
}
