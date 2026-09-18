import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 供应商门户首页（占位）：后续业务逻辑放在 features/supplier-portal。 */
export default function SupplierPortalHomePage() {
  return <PlaceholderPage {...routeMeta.supplierPortalHome} />
}
