import { describe, expect, it } from 'vitest'
import type { NavigationItem } from '@/config/navigation'
import { filterNavigationByPermissions, getMenuPermissionCode, hasAnyPermission, hasPermission } from './permissions'

/** 构造最小导航树：一个一级叶子 + 一个含两个叶子的分组。 */
const NAVIGATION: NavigationItem[] = [
  { key: '/dashboard', label: '工作台', path: '/dashboard' },
  {
    key: 'system',
    label: '系统管理',
    children: [
      { key: '/system/user', label: '用户管理', path: '/system/user' },
      { key: '/system/role', label: '角色管理', path: '/system/role' },
    ],
  },
]

describe('hasPermission', () => {
  it('精确匹配权限码', () => {
    expect(hasPermission(['menu:system:user'], 'menu:system:user')).toBe(true)
    expect(hasPermission(['menu:system:user'], 'system:user:create')).toBe(false)
  })

  it("'*' 通配直接通过", () => {
    expect(hasPermission(['*'], 'anything:at:all')).toBe(true)
  })
})

describe('hasAnyPermission', () => {
  it('任一命中即通过', () => {
    expect(hasAnyPermission(['a', 'b'], ['x', 'b'])).toBe(true)
    expect(hasAnyPermission(['a'], ['x', 'y'])).toBe(false)
    expect(hasAnyPermission(['*'], ['x', 'y'])).toBe(true)
  })
})

describe('getMenuPermissionCode', () => {
  it('路径段以冒号连接并去掉空段', () => {
    expect(getMenuPermissionCode('/system/user')).toBe('menu:system:user')
    expect(getMenuPermissionCode('/dashboard')).toBe('menu:dashboard')
  })
})

describe('filterNavigationByPermissions', () => {
  it('无权限叶子被剔除，分组子级全空时整组隐藏', () => {
    const result = filterNavigationByPermissions(NAVIGATION, ['menu:dashboard'])
    expect(result).toHaveLength(1)
    expect(result[0]?.key).toBe('/dashboard')
  })

  it('只保留有权限的子级，分组结构保留', () => {
    const result = filterNavigationByPermissions(NAVIGATION, ['menu:system:role'])
    expect(result).toHaveLength(1)
    expect(result[0]?.key).toBe('system')
    expect(result[0]?.children).toEqual([{ key: '/system/role', label: '角色管理', path: '/system/role' }])
  })

  it("'*' 通配保留完整导航", () => {
    const result = filterNavigationByPermissions(NAVIGATION, ['*'])
    expect(result).toEqual(NAVIGATION)
  })

  it('不修改原数组', () => {
    filterNavigationByPermissions(NAVIGATION, [])
    expect(NAVIGATION).toHaveLength(2)
    expect(NAVIGATION[1]?.children).toHaveLength(2)
  })
})
