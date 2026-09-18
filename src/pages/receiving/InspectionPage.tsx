import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 验收单页面（占位）：后续业务逻辑放在 features/receiving。 */
export default function InspectionPage() {
  return <PlaceholderPage {...routeMeta.receivingInspection} />
}
