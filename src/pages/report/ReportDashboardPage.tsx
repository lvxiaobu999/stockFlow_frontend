import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 报表首页（占位）：后续业务逻辑放在 features/report。 */
export default function ReportDashboardPage() {
  return <PlaceholderPage {...routeMeta.reportDashboard} />
}
