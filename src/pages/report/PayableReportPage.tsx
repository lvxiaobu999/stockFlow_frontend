import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 付款 / 应付报表页面（占位）：后续业务逻辑放在 features/report。 */
export default function PayableReportPage() {
  return <PlaceholderPage {...routeMeta.reportPayable} />
}
