import { LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Dropdown, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { PROFILE_PATH } from '@/config/routes'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { useAuthStore } from '@/stores/authStore'

/**
 * 顶栏用户区：头像下拉提供「个人中心」入口与「退出登录」。
 *
 * 触发器用原生 button 保证键盘可达（antd Dropdown 的默认 div 触发器
 * 不响应 Tab 聚焦），样式在 App.less 页头分区重置为无边框。
 */
export function AuthHeaderUser() {
  const currentUser = useAuthStore((state) => state.currentUser)
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <Dropdown
      menu={{
        items: [
          { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
          { type: 'divider' },
          { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
        ],
        onClick: ({ key }) => {
          if (key === 'profile') navigate(PROFILE_PATH)
          if (key === 'logout') logout.mutate()
        },
      }}
      placement="bottomRight"
      trigger={['click']}
    >
      <button type="button" className="header-user" aria-label="账号菜单">
        <Avatar size={26} icon={<UserOutlined />} />
        <Typography.Text strong className="header-user-name">
          {currentUser?.name ?? '未登录'}
        </Typography.Text>
      </button>
    </Dropdown>
  )
}
