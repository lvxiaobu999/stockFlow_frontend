import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 当前库存页面（占位）：后续业务逻辑放在 features/inventory。 */
export default function CurrentStockPage() {
  return <PlaceholderPage {...routeMeta.currentStock} />
}
