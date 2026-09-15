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
import { Avatar, Badge, Button, Card, Col, ConfigProvider, Layout, Menu, Progress, Row, Space, Statistic, Table, Tag, theme, Typography } from 'antd'
import { useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'

const { Header, Sider, Content } = Layout
const menuItems: MenuProps['items'] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: <Link to="/dashboard">工作台</Link> },
  {
    key: 'inventory', icon: <DatabaseOutlined />, label: '库存管理', children: [
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

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const selected = location.pathname === '/' ? '/dashboard' : location.pathname

  return (
    <Layout className="app-shell">
      <Sider collapsible collapsed={collapsed} trigger={null} width={240} className="app-sider">
        <div className="brand">
          <div className="brand-mark">S</div>
          {!collapsed && <div><strong>StockFlow</strong><span>进存销管理系统</span></div>}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selected]} items={menuItems} />
        {!collapsed && <div className="sider-footer"><span className="status-dot" /> 数据服务正常</div>}
      </Sider>
      <Layout>
        <Header className="app-header">
          <Space size="middle">
            <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
            <Typography.Text type="secondary">企业库存管理 · 2025 年度</Typography.Text>
          </Space>
          <Space size="large">
            <Badge count={3} size="small"><BellOutlined className="header-icon" /></Badge>
            <Space><Avatar size="small" icon={<UserOutlined />} /><Typography.Text strong>管理员</Typography.Text></Space>
          </Space>
        </Header>
        <Content className="app-content"><Outlet /></Content>
      </Layout>
    </Layout>
  )
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return <div className="placeholder-page"><Typography.Title level={2}>{title}</Typography.Title><Typography.Paragraph type="secondary">{description}</Typography.Paragraph></div>
}

const inventoryColumns = [
  { title: '商品', dataIndex: 'name', key: 'name' },
  { title: 'SKU', dataIndex: 'sku', key: 'sku' },
  { title: '当前库存', dataIndex: 'stock', key: 'stock', render: (value: number) => <Typography.Text strong>{value}</Typography.Text> },
  { title: '安全库存', dataIndex: 'safe', key: 'safe' },
  { title: '状态', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color="error">{status}</Tag> },
]

const inventoryData = [
  { key: '1', name: '无线蓝牙耳机 Pro', sku: 'SFK-10024', stock: 8, safe: 20, status: '库存不足' },
  { key: '2', name: '人体工学办公椅', sku: 'SFK-20017', stock: 12, safe: 15, status: '库存不足' },
  { key: '3', name: 'USB-C 多功能扩展坞', sku: 'SFK-30008', stock: 18, safe: 30, status: '库存不足' },
]

function DashboardPage() {
  return <div className="dashboard-page">
    <div className="page-heading"><div><Typography.Title level={2}>工作台</Typography.Title><Typography.Text type="secondary">欢迎回来，管理员。这里是今天的经营概览。</Typography.Text></div><Tag color="blue">数据更新于 10:24</Tag></div>
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}><Card><Statistic title="商品总数" value={1284} suffix="件" /></Card></Col>
      <Col xs={24} sm={12} lg={6}><Card><Statistic title="库存总值" value={386.4} precision={1} prefix="¥" suffix="万" /></Card></Col>
      <Col xs={24} sm={12} lg={6}><Card><Statistic title="本月销售额" value={86.2} precision={1} prefix="¥" suffix="万" valueStyle={{ color: '#1677ff' }} /></Card></Col>
      <Col xs={24} sm={12} lg={6}><Card><Statistic title="待处理订单" value={24} suffix="单" valueStyle={{ color: '#fa8c16' }} /></Card></Col>
    </Row>
    <Row gutter={[16, 16]} className="dashboard-row">
      <Col xs={24} lg={16}><Card title="库存预警" extra={<Link to="/inventory">查看全部</Link>}><Table columns={inventoryColumns} dataSource={inventoryData} pagination={false} size="middle" /></Card></Col>
      <Col xs={24} lg={8}><Card title="本月销售目标"><div className="target-summary"><Typography.Title level={2}>¥86.2万</Typography.Title><Typography.Text type="secondary">目标 ¥120万</Typography.Text></div><Progress percent={72} strokeColor="#1677ff" /><Typography.Text type="secondary">较上月增长 18.6%</Typography.Text></Card></Col>
    </Row>
  </div>
}

function App() {
  return <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#1677ff', borderRadius: 8, fontFamily: 'Inter, "PingFang SC", system-ui, sans-serif' } }}>
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/inventory" element={<PlaceholderPage title="库存总览" description="实时掌握各仓库库存数量与周转情况。" />} />
        <Route path="/inventory/records" element={<PlaceholderPage title="出入库记录" description="追踪每一笔入库、出库和调拨流水。" />} />
        <Route path="/products" element={<PlaceholderPage title="商品管理" description="维护商品档案、分类、规格和库存上下限。" />} />
        <Route path="/sales" element={<PlaceholderPage title="销售订单" description="管理销售订单及发货状态。" />} />
        <Route path="/purchases" element={<PlaceholderPage title="采购订单" description="管理采购计划、供应商与到货进度。" />} />
        <Route path="/settings" element={<PlaceholderPage title="系统设置" description="配置组织、角色权限和基础参数。" />} />
        <Route path="*" element={<PlaceholderPage title="页面不存在" description="请从左侧菜单选择一个有效的功能页面。" />} />
      </Route>
    </Routes>
  </ConfigProvider>
}

export default App
