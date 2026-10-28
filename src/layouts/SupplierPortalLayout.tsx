import { ConfigProvider, Dropdown, Layout, Menu, Typography } from 'antd'
import { LogoutOutlined, ShopOutlined } from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { useAuthStore } from '@/stores/authStore'

const { Header, Content } = Layout

/**
 * 供应商门户壳层：浅色顶部导航（区别于管理端深色侧边栏），品牌色切换为
 * 门户浅绿主题（需求：视觉与主系统统一但可辨识）。
 *
 * 门户与管理端共用登录会话与权限模型，仅布局与数据范围不同：
 * 数据由门户接口按供应商账号自动过滤，壳层不感知业务。
 * 个人中心为管理端功能，门户用户下拉只提供退出登录。
 */
export default function SupplierPortalLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useAuthStore((state) => state.currentUser)
  const logout = useLogout()

  // 顶部导航项：与 routes.ts 的门户叶子路由一一对应。
  const menuItems = [
    { key: routeMeta.supplierPortalHome.path, label: routeMeta.supplierPortalHome.title },
    { key: routeMeta.supplierPortalMyOrders.path, label: routeMeta.supplierPortalMyOrders.title },
    { key: routeMeta.supplierPortalToShip.path, label: routeMeta.supplierPortalToShip.title },
    { key: routeMeta.supplierPortalShipments.path, label: routeMeta.supplierPortalShipments.title },
  ]

  return (
    <ConfigProvider
      theme={{
        token: {
          // 门户主题色：浅绿（区别于管理端品牌蓝），操作按钮与选中态统一取色。
          colorPrimary: '#16a34a',
        },
      }}
    >
      <Layout className="min-h-screen bg-slate-50">
        <Header className="sticky top-0 z-20 flex h-16 items-center gap-6 border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-green-600 text-white">
              <ShopOutlined aria-hidden />
            </span>
            <div className="leading-tight">
              <Typography.Text strong className="block text-base">
                供应商门户
              </Typography.Text>
              <Typography.Text type="secondary" className="block text-xs">
                进销存系统 · 合作伙伴入口
              </Typography.Text>
            </div>
          </div>
          <Menu
            mode="horizontal"
            className="min-w-0 flex-1 border-b-0"
            items={menuItems}
            selectedKeys={[location.pathname]}
            onClick={({ key }) => navigate(key)}
          />
          <Dropdown
            menu={{
              items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true }],
              onClick: ({ key }) => {
                if (key === 'logout') logout.mutate()
              },
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            {/* 触发器用原生 button 保证键盘可达（与 AuthHeaderUser 同口径）。 */}
            <button
              type="button"
              className="flex items-center gap-2 rounded-md border-none bg-transparent px-2 py-1"
              aria-label="账号菜单"
            >
              <Typography.Text strong>{currentUser?.name ?? '供应商'}</Typography.Text>
              <Typography.Text type="secondary" className="text-xs">
                {currentUser?.username}
              </Typography.Text>
            </button>
          </Dropdown>
        </Header>
        <Content className="px-6 py-6">
          <div className="dashboard-page">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  )
}
