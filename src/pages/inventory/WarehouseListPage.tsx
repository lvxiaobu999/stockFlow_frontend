import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 仓库列表页面（占位）：后续业务逻辑放在 features/inventory。 */
export default function WarehouseListPage() {
  return <PlaceholderPage {...routeMeta.warehouse} />
}
