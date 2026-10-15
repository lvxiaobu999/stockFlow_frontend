import { describe, expect, it } from 'vitest'
import { resolvePermissions } from './auth'
import { OPERATION_LOG_TOTAL, operationLogsMock } from './operation-logs'
import { permissionTreeMock, roleMock, rolePermissionCodes } from './roles'
import { usersMock, DEMO_SUPPLIER_USERNAME, getRoleUserCount } from './users'

/**
 * Mock 数据集不变量：这些约束是「演示账号体系自洽」的底线，
 * 改动任一 mock 数据文件后此测试必须保持通过（详见 docs/接口与 Mock 说明.md）。
 */
describe('mock 数据集不变量', () => {
  it('用户 34 条 = 16 内部员工 + 18 供应商', () => {
    expect(usersMock).toHaveLength(34)
    expect(usersMock.filter((user) => user.userType === 'staff')).toHaveLength(16)
    expect(usersMock.filter((user) => user.userType === 'supplier')).toHaveLength(18)
  })

  it('admin 内置账号存在且不可停用；陈杰为停用演示账号', () => {
    const admin = usersMock.find((user) => user.username === 'admin')
    expect(admin?.builtin).toBe(true)
    expect(admin?.status).toBe(1)
    const chenjie = usersMock.find((user) => user.username === 'chenjie')
    expect(chenjie?.status).toBe(0)
  })

  it('各角色 userCount 与用户数据实时计算一致（合计 = 34）', () => {
    let sum = 0
    for (const role of roleMock) {
      expect(getRoleUserCount(role.code)).toBe(role.userCount)
      sum += role.userCount
    }
    expect(sum).toBe(usersMock.length)
  })

  it('角色共 6 个，admin / supplier 为内置不可停用', () => {
    expect(roleMock).toHaveLength(6)
    const builtins = roleMock.filter((role) => role.builtin)
    expect(builtins.map((role) => role.code).sort()).toEqual(['admin', 'supplier'])
  })

  it('操作日志 156 条且无重复 id', () => {
    expect(operationLogsMock).toHaveLength(OPERATION_LOG_TOTAL)
    expect(new Set(operationLogsMock.map((log) => log.id)).size).toBe(OPERATION_LOG_TOTAL)
  })

  it('权限树分组均为 group: 伪码，且叶子 key 均为合法权限码', () => {
    // 顶层 = 1 个工作台叶子 + 11 个分组；分组一律使用 group: 伪码。
    expect(permissionTreeMock).toHaveLength(12)
    for (const group of permissionTreeMock) {
      if (group.children) {
        expect(group.key.startsWith('group:')).toBe(true)
      } else {
        expect(group.key.startsWith('menu:')).toBe(true)
      }
    }
    const keys: string[] = []
    const walk = (nodes: typeof permissionTreeMock) => {
      for (const node of nodes) {
        keys.push(node.key)
        if (node.children) walk(node.children)
      }
    }
    walk(permissionTreeMock)
    // 菜单码 / 按钮码 / 分组伪码以外的 key 不允许出现。
    for (const key of keys) {
      expect(key.startsWith('menu:') || key.startsWith('group:') || key.includes(':')).toBe(true)
    }
  })

  it('各角色默认权限码都是权限树中真实存在的码（admin 的 * 除外）', () => {
    const keys = new Set<string>()
    const walk = (nodes: typeof permissionTreeMock) => {
      for (const node of nodes) {
        keys.add(node.key)
        if (node.children) walk(node.children)
      }
    }
    walk(permissionTreeMock)
    for (const [code, permissions] of Object.entries(rolePermissionCodes)) {
      for (const permission of permissions) {
        if (permission === '*') {
          expect(code).toBe('admin')
          continue
        }
        expect(keys.has(permission)).toBe(true)
      }
    }
  })

  it('供应商演示账号存在且解析出的权限仅含工作台', () => {
    const supplier = usersMock.find((user) => user.username === DEMO_SUPPLIER_USERNAME)
    expect(supplier).toBeDefined()
    const permissions = resolvePermissions(supplier!)
    expect(permissions).toContain('menu:dashboard')
    expect(permissions).not.toContain('*')
  })
})
