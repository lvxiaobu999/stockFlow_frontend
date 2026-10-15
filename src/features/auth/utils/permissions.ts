import type { NavigationItem } from '@/config/navigation'

/**
 * 权限判断纯函数集。
 *
 * 权限码约定（与后端 permission 表一致）：
 * - 菜单码：`menu:<路径段以:连接>`，如 `/system/user` → `menu:system:user`，控制侧边栏与路由访问；
 * - 按钮码：`<域>:<实体>:<动作>`，如 `system:user:create`，控制页面内按钮显隐；
 * - `*` 为超级通配，仅内置管理员持有。
 */

/** 判断是否拥有某个权限码；持有 '*' 时视为全部通过。 */
export function hasPermission(permissions: string[], code: string): boolean {
  if (permissions.includes('*')) return true
  return permissions.includes(code)
}

/** 判断是否拥有任意一个权限码，用于「多选一」的按钮显隐场景。 */
export function hasAnyPermission(permissions: string[], codes: string[]): boolean {
  if (permissions.includes('*')) return true
  return codes.some((code) => permissions.includes(code))
}

/** 由路由路径推导菜单权限码：`/system/user` → `menu:system:user`。 */
export function getMenuPermissionCode(path: string): string {
  return `menu:${path.split('/').filter(Boolean).join(':')}`
}

/**
 * 按权限过滤导航树（不修改原数组）：
 * - 叶子项按其菜单码判断，无权限则剔除；
 * - 分组递归过滤子级，子级全部被剔除时整组隐藏，避免出现空分组。
 */
export function filterNavigationByPermissions(items: NavigationItem[], permissions: string[]): NavigationItem[] {
  const result: NavigationItem[] = []
  for (const item of items) {
    if (item.children) {
      const children = filterNavigationByPermissions(item.children, permissions)
      // 整组子级都无权限时连分组一起隐藏，保持侧边栏不留空壳。
      if (children.length > 0) {
        result.push({ ...item, children })
      }
      continue
    }
    if (item.path && hasPermission(permissions, getMenuPermissionCode(item.path))) {
      result.push(item)
    }
  }
  return result
}
