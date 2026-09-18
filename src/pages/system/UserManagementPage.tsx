import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 用户管理页面（占位）：后续业务逻辑放在 features/system。 */
export default function UserManagementPage() {
  return <PlaceholderPage {...routeMeta.systemUser} />
}
