import type { MenuProps } from 'antd'
import { cloneElement, isValidElement, type ReactElement } from 'react'
import { ConfigProvider, Layout, Menu } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { appEnv } from '@/config/env'
import { getNavigationParentKey, navigationItems, type NavigationItem } from '@/config/navigation'
import { useAppStore } from '@/stores/appStore'
import type { SvgIconProps } from '@/components/common/SvgIcon'

const { Sider } = Layout

/** 展开态图标尺寸（px）。SvgIcon 默认 1em 跟随字号，而 antd 给一级项图标合并
 * styles.itemIcon 时图标自身内联样式优先级更高，所以尺寸只能在生成 items 时显式传入。 */
const MENU_ICON_SIZE = 20
/** 折叠态图标放大到 20px，撑满 20x20 的圆形按钮。 */
const COLLAPSED_MENU_ICON_SIZE = 20

/** 把导航配置递归转换成 Ant Design Menu 需要的 items 结构。 */
function toMenuItems(items: NavigationItem[], iconSize: number): MenuProps['items'] {
  return items.map((item) => ({
    key: item.key,
    icon: isValidElement(item.icon)
      ? cloneElement(item.icon as ReactElement<SvgIconProps>, { size: iconSize })
      : item.icon,
    // 叶子项渲染为内部 Link，保证 NavigationProgress 能捕获到内部跳转。
    label: item.path ? <Link to={item.path}>{item.label}</Link> : item.label,
    children: item.children ? toMenuItems(item.children, iconSize) : undefined,
  }))
}

/**
 * 展开态菜单样式（Menu 的 styles 语义插槽，以内联样式注入，优先级高于 antd 默认样式）。
 * 配合默认 40px 行高，20px 圆角正好形成左右两端半圆的胶囊形。
 */
const expandedMenuStyles: MenuProps['styles'] = {
  // 左右留白，让胶囊形菜单项不贴侧边栏边缘。
  root: { paddingInline: 12 },
  // 一级叶子项（如工作台）。
  item: { borderRadius: 20 },
  subMenu: {
    // 分组内的叶子项：展开时缩进显示，折叠后出现在悬浮弹层里，共用同一套圆角。
    item: { borderRadius: 20 },
  },
}

/**
 * 折叠态菜单样式：一级项收敛为 40x40 的圆形按钮，隐藏文字只保留图标。
 * 分组标题在 antd 6.6.4 里没有语义插槽，其折叠样式由 App.css 的 .app-side-menu 规则兜底。
 */
const collapsedMenuStyles: MenuProps['styles'] = {
  root: { paddingInline: 12 },
  item: {
    width: 40,
    height: 40,
    // 折叠宽度 80px 减去根节点两侧 12px 内边距后，用 auto 边距水平居中。
    marginInline: 'auto',
    // 注意必须写四个物理长 padding 而不是 padding 简写：折叠时菜单从 inline 切到
    // vertical 模式，rc-menu 注入的 paddingLeft 会从内联样式中消失，React 清理该
    // 过期属性时会连带清空 padding 简写的左侧，导致 antd 的折叠态缩进（约 15.6px）
    // 生效、40px 图标被挤压成 24x40。
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  // 折叠态隐藏一级项文字，防止透明文字占据宽度导致图标偏移。
  itemContent: { display: 'none' },
  // 图标右侧为文字预留的间距在折叠态没有意义，清零保证几何居中。
  itemIcon: { marginInlineEnd: 0 },
  subMenu: {
    // 悬浮弹层里的子项保持正常列表样式，仅保留胶囊圆角。
    item: { borderRadius: 20 },
  },
}

/** 侧边栏：品牌区、可折叠导航菜单，以及响应式断点下的自动收起。 */
export function AppSidebar() {
  const collapsed = useAppStore((state) => state.sidebarCollapsed)
  const location = useLocation()
  // 根路径没有对应菜单项，映射到工作台，保证刷新首页时高亮正确。
  const selected = location.pathname === '/' ? '/dashboard' : location.pathname
  // 反查当前路径所属的一级分组，用于首次加载时展开正确的菜单分组。
  const parentKey = getNavigationParentKey(location.pathname)

  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            itemSelectedBg: `linear-gradient(to right,  var(--ant-color-primary),  var(--ant-color-primary-hover), var(--ant-color-primary))`,
          },
        },
      }}
    >
      <Sider
        theme="light"
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
          theme="light"
          mode="inline"
          // 语义插槽覆盖不到的部分（选中态渐变、分组标题样式）用该类名在 App.css 兜底。
          classNames={{ root: 'app-side-menu' }}
          styles={collapsed ? collapsedMenuStyles : expandedMenuStyles}
          selectedKeys={[selected]}
          defaultOpenKeys={parentKey ? [parentKey] : []}
          items={toMenuItems(navigationItems, collapsed ? COLLAPSED_MENU_ICON_SIZE : MENU_ICON_SIZE)}
          /* triggerSubMenuAction='click' */
        />
        {!collapsed ? (
          <div className="sider-footer">
            <span className="status-dot" /> 数据服务正常 · v{__APP_VERSION__}
          </div>
        ) : null}
      </Sider>
    </ConfigProvider>
  )
}
