import { BellOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Button, Layout, Space, Tooltip, Typography } from 'antd'
import { AuthHeaderUser } from '@/features/auth/components/AuthHeaderUser'
import { useAppStore } from '@/stores/appStore'

const { Header } = Layout

/**
 * 顶部栏：折叠侧边栏、通知入口（占位）与当前登录用户下拉。
 * 用户身份来自认证会话（/auth/me），个人中心与退出登录入口在 AuthHeaderUser 内。
 */
export function AppHeader() {
  // 只订阅折叠状态，避免跟随无关字段重复渲染。
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
        {/* 通知中心尚未实现，先作为占位入口；有未读数据后替换为 Badge。 */}
        <Tooltip title="通知中心建设中">
          <BellOutlined className="header-icon" aria-label="通知" />
        </Tooltip>
        <AuthHeaderUser />
      </Space>
    </Header>
  )
}
