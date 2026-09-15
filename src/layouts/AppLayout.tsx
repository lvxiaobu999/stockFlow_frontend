import {
  BellOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  InboxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Avatar, Badge, Button, Layout, Menu, Space, Typography } from 'antd'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

const { Header, Sider, Content } = Layout

const menuItems: MenuProps['items'] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: <Link to="/dashboard">工作台</Link> },
  {
    key: 'inventory',
    icon: <DatabaseOutlined />,
    label: '库存管理',
    children: [
      { key: '/inventory', label: <Link to="/inventory">库存总览</Link> },
      { key: '/inventory/records', label: <Link to="/inventory/records">出入库记录</Link> },
    ],
  },
  { key: '/products', icon: <TagsOutlined />, label: <Link to="/products">商品管理</Link> },
  { key: '/sales', icon: <ShoppingCartOutlined />, label: <Link to="/sales">销售订单</Link> },
  { key: '/purchases', icon: <InboxOutlined />, label: <Link to="/purchases">采购订单</Link> },
  { type: 'divider' },
  { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">系统设置</Link> },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const selected = location.pathname === '/' ? '/dashboard' : location.pathname

  return (
    <Layout className="app-shell">
      <Sider collapsible collapsed={collapsed} trigger={null} width={240} className="app-sider">
        <div className="brand">
          <div className="brand-mark">S</div>
          {!collapsed && (
            <div>
              <strong>StockFlow</strong>
              <span>进存销管理系统</span>
            </div>
          )}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selected]} items={menuItems} />
        {!collapsed && (
          <div className="sider-footer">
            <span className="status-dot" /> 数据服务正常 · v{__APP_VERSION__}
          </div>
        )}
      </Sider>
      <Layout>
        <Header className="app-header">
          <Space size="middle">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <Typography.Text type="secondary">企业库存管理 · 2025 年度</Typography.Text>
          </Space>
          <Space size="large">
            <Badge count={3} size="small">
              <BellOutlined className="header-icon" />
            </Badge>
            <Space>
              <Avatar size="small" icon={<UserOutlined />} />
              <Typography.Text strong>管理员</Typography.Text>
            </Space>
          </Space>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
