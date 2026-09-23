import { BellOutlined, MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Badge, Button, Layout, Space, Typography } from 'antd'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'

const { Header } = Layout

/** 顶部栏：折叠侧边栏、通知入口与当前登录用户信息。 */
export function AppHeader() {
  // 从两个 store 中按需订阅最小粒度状态，避免组件跟随无关字段重复渲染。
  const currentUser = useAuthStore((state) => state.currentUser)
  const unreadNotifications = useAuthStore((state) => state.unreadNotifications)
  const collapsed = useAppStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)

  return (
    <Header className="app-header">
      <Space size="middle">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleSidebar}
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
        />
        <Typography.Text className="header-context text-brand-600" type="secondary">
          企业库存管理 · 2025 年度
        </Typography.Text>
      </Space>
      <Space size="large">
        <Badge count={unreadNotifications} size="small">
          <BellOutlined className="header-icon" aria-label={`通知 ${unreadNotifications} 条`} />
        </Badge>
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Typography.Text strong>{currentUser?.name ?? '未登录'}</Typography.Text>
        </Space>
      </Space>
    </Header>
  )
}
