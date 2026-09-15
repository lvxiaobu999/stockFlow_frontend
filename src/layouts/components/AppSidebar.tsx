import type { MenuProps } from 'antd'
import { Layout, Menu } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { appEnv } from '@/config/env'
import { navigationItems, type NavigationItem } from '@/config/navigation'
import { useAppStore } from '@/stores/appStore'

const { Sider } = Layout

function toMenuItems(items: NavigationItem[]): MenuProps['items'] {
  return items.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.path ? <Link to={item.path}>{item.label}</Link> : item.label,
    children: item.children ? toMenuItems(item.children) : undefined,
  }))
}

export function AppSidebar() {
  const collapsed = useAppStore((state) => state.sidebarCollapsed)
  const location = useLocation()
  const selected = location.pathname === '/' ? '/dashboard' : location.pathname

  return (
    <Sider collapsible collapsed={collapsed} trigger={null} width={240} className="app-sider">
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
