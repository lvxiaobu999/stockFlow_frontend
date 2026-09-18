import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 角色管理页面（占位）：后续业务逻辑放在 features/system。 */
export default function RoleManagementPage() {
  return <PlaceholderPage {...routeMeta.systemRole} />
}
