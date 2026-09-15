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
  key: string
  label: string
  path?: string
  icon?: ReactNode
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

export function findNavigationItem(path: string): NavigationItem | undefined {
  for (const item of navigationItems) {
    if (item.path === path) return item
    const child = item.children?.find((nestedItem) => nestedItem.path === path)
    if (child) return child
  }
  return undefined
}
