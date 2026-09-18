import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 操作日志页面（占位）：后续业务逻辑放在 features/system。 */
export default function OperationLogPage() {
  return <PlaceholderPage {...routeMeta.systemOperationLog} />
}
