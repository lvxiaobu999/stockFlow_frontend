import type { MenuProps } from 'antd'
import { Layout, Menu } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { appEnv } from '@/config/env'
import { navigationItems, type NavigationItem } from '@/config/navigation'
import { useAppStore } from '@/stores/appStore'

const { Sider } = Layout

/** 把导航配置递归转换成 Ant Design Menu 需要的 items 结构。 */
function toMenuItems(items: NavigationItem[]): MenuProps['items'] {
  return items.map((item) => ({
    key: item.key,
    icon: item.icon,
    // 叶子项渲染为内部 Link，保证 NavigationProgress 能捕获到内部跳转。
    label: item.path ? <Link to={item.path}>{item.label}</Link> : item.label,
    children: item.children ? toMenuItems(item.children) : undefined,
  }))
}

/** 侧边栏：品牌区、可折叠导航菜单，以及响应式断点下的自动收起。 */
export function AppSidebar() {
  const collapsed = useAppStore((state) => state.sidebarCollapsed)
  const location = useLocation()
  // 根路径没有对应菜单项，映射到工作台，保证刷新首页时高亮正确。
  const selected = location.pathname === '/' ? '/dashboard' : location.pathname

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      breakpoint="md"
      onBreakpoint={(broken) => useAppStore.getState().setSidebarCollapsed(broken)}
      width={240}
      className="app-sider"
    >
      <div className="brand">
        <div className="brand-mark">S</div>
        {!collapsed ? (
          <div>
            <strong>{appEnv.appName}</strong>
            <span>进销存管理系统</span>
          </div>
        ) : null}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selected]}
        defaultOpenKeys={location.pathname.startsWith('/inventory') ? ['inventory'] : []}
        items={toMenuItems(navigationItems)}
      />
      {!collapsed ? (
        <div className="sider-footer">
          <span className="status-dot" /> 数据服务正常 · v{__APP_VERSION__}
        </div>
      ) : null}
    </Sider>
  )
}
