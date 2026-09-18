import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 我已审批页面（占位）：后续业务逻辑放在 features/approval。 */
export default function ProcessedApprovalPage() {
  return <PlaceholderPage {...routeMeta.approvalProcessed} />
}
