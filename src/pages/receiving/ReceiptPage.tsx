import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 收货单页面（占位）：后续业务逻辑放在 features/receiving。 */
export default function ReceiptPage() {
  return <PlaceholderPage {...routeMeta.receivingReceipt} />
}
