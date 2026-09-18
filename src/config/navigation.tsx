import {
  DashboardOutlined,
  DatabaseOutlined,
  InboxOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import { routeMeta } from '@/config/routes'

export interface NavigationItem {
  /** 菜单唯一标识；有子菜单时作为分组 key，没有子菜单时通常等于 path。 */
  key: string
  /** 菜单显示文案。 */
  label: string
  /** 叶子菜单的跳转路径；有子菜单的父级可以省略。 */
  path?: string
  /** 菜单图标，仅一级菜单需要。 */
  icon?: ReactNode
  /** 子菜单，递归复用本类型。 */
  children?: NavigationItem[]
}

/** 侧边栏标题、路径和分组的唯一配置来源。 */
export const navigationItems: NavigationItem[] = [
  {
    key: routeMeta.dashboard.path,
    label: routeMeta.dashboard.title,
    path: routeMeta.dashboard.path,
    icon: <DashboardOutlined />,
  },
  {
    key: 'inventory',
    label: '库存管理',
    icon: <DatabaseOutlined />,
    children: [
      { key: routeMeta.inventory.path, label: routeMeta.inventory.title, path: routeMeta.inventory.path },
      {
        key: routeMeta.inventoryRecords.path,
        label: routeMeta.inventoryRecords.title,
        path: routeMeta.inventoryRecords.path,
      },
    ],
  },
  {
    key: routeMeta.products.path,
    label: routeMeta.products.title,
    path: routeMeta.products.path,
    icon: <TagsOutlined />,
  },
  {
    key: routeMeta.sales.path,
    label: routeMeta.sales.title,
    path: routeMeta.sales.path,
    icon: <ShoppingCartOutlined />,
  },
  {
    key: routeMeta.purchases.path,
    label: routeMeta.purchases.title,
    path: routeMeta.purchases.path,
    icon: <InboxOutlined />,
  },
  {
    key: routeMeta.settings.path,
    label: routeMeta.settings.title,
    path: routeMeta.settings.path,
    icon: <SettingOutlined />,
  },
]

/** 按路径在导航配置中查找匹配项（含二级子项），用于页面标题等反查场景。 */
export function findNavigationItem(path: string): NavigationItem | undefined {
  for (const item of navigationItems) {
    if (item.path === path) return item
    // 一级未命中时再向下查找子菜单，避免遗漏分组内的叶子项。
    const child = item.children?.find((nestedItem) => nestedItem.path === path)
    if (child) return child
  }
  return undefined
}
