import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { routeMeta } from '@/config/routes'
import type { ApprovalAction, ApprovalRecord } from '@/features/approval/types'
import { isTaxNoValid } from '@/features/supplier/utils/validators'
import { PRODUCT_UNITS } from '@/features/product/types'
import { isPriceValid } from '@/features/product/utils/validators'
import type { PurchaseRequestStatus } from '@/features/purchase/types'
import { categoryMock } from './categories'
import { productsMock } from './products'
import { resolvePermissions } from './auth'
import { OPERATION_LOG_TOTAL, LOG_MODULES, operationLogsMock } from './operation-logs'
import { permissionTreeMock, roleMock, rolePermissionCodes } from './roles'
import { suppliersMock } from './suppliers'
import { usersMock, DEMO_SUPPLIER_USERNAME, getRoleUserCount } from './users'
import { warehousesMock } from './warehouses'
import { approvalRecordsMock, nextPurchaseRequestCode, purchaseRequestsMock } from './purchaseRequests'

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

  it('权限树的菜单码与 routeMeta 路由一一对应', () => {
    // 收集权限树里的全部菜单码（menu: 前缀），分组伪码除外。
    const menuKeys = new Set<string>()
    const walk = (nodes: typeof permissionTreeMock) => {
      for (const node of nodes) {
        if (node.key.startsWith('menu:')) menuKeys.add(node.key)
        if (node.children) walk(node.children)
      }
    }
    walk(permissionTreeMock)

    // menu:a:b ↔ 路由 /a/b 双向校验，防止导航与权限树漂移。
    const paths = new Set<string>(Object.values(routeMeta).map((meta) => meta.path))
    const menuKeyToPath = (key: string) => `/${key.slice('menu:'.length).split(':').join('/')}`
    for (const key of menuKeys) {
      expect(paths.has(menuKeyToPath(key))).toBe(true)
    }
    for (const path of paths) {
      expect(menuKeys.has(`menu:${path.slice(1).split('/').join(':')}`)).toBe(true)
    }
  })
})

describe('基础资料数据集不变量', () => {
  it('分类 18 节点：编码唯一、层级段式自洽且最多 3 级', () => {
    expect(categoryMock).toHaveLength(18)
    const codes = categoryMock.map((item) => item.code)
    expect(new Set(codes).size).toBe(18)
    // 编码层级：两位一段（010000 一级 / 010100 二级 / 010101 三级）。
    const levelOf = (code: string) => (code.slice(4, 6) !== '00' ? 3 : code.slice(2, 4) !== '00' ? 2 : 1)
    const byId = new Map(categoryMock.map((item) => [item.id, item]))
    for (const item of categoryMock) {
      expect(item.code).toMatch(/^\d{6}$/)
      if (item.parentId === null) {
        expect(item.code.endsWith('0000')).toBe(true)
      } else {
        const parent = byId.get(item.parentId)
        expect(parent).toBeDefined()
        const parentLevel = levelOf(parent!.code)
        expect(parentLevel).toBeLessThan(3)
        // 子编码沿用父编码的上级段，自身段非 00。
        expect(item.code.startsWith(parent!.code.slice(0, parentLevel * 2))).toBe(true)
        if (parentLevel === 1) expect(item.code.slice(4, 6)).toBe('00')
        else expect(item.code.slice(4, 6)).not.toBe('00')
      }
    }
  })

  it('分类中仅 010202 铅笔为停用演示节点，且无商品引用（可删除）', () => {
    const disabled = categoryMock.filter((item) => item.status === 0)
    expect(disabled.map((item) => item.code)).toEqual(['010202'])
    const pencil = disabled[0]
    expect(productsMock.some((product) => product.categoryId === pencil.id)).toBe(false)
  })

  it('商品 30 条：编码唯一、分类引用有效、预警与停用口径正确', () => {
    expect(productsMock).toHaveLength(30)
    expect(new Set(productsMock.map((item) => item.code)).size).toBe(30)
    const categoryIds = new Set(categoryMock.map((item) => item.id))
    for (const product of productsMock) {
      expect(categoryIds.has(product.categoryId)).toBe(true)
      expect(PRODUCT_UNITS).toContain(product.unit)
      expect(isPriceValid(String(product.purchasePrice))).toBe(true)
    }
    expect(productsMock.filter((item) => item.totalStock < item.safetyStock).length).toBeGreaterThanOrEqual(5)
    expect(productsMock.filter((item) => item.status === 0)).toHaveLength(3)
  })

  it('供应商 16 家：编码唯一、恰好 14 家有门户账号且不重复、税号均合法', () => {
    expect(suppliersMock).toHaveLength(16)
    expect(new Set(suppliersMock.map((item) => item.code)).size).toBe(16)
    const portalUsernames = suppliersMock.map((item) => item.portalUsername).filter(Boolean)
    expect(portalUsernames).toHaveLength(14)
    expect(new Set(portalUsernames).size).toBe(14)
    // 门户账号必须能对应到真实供应商类型用户。
    for (const username of portalUsernames) {
      const user = usersMock.find((item) => item.userType === 'supplier' && item.username === username)
      expect(user).toBeDefined()
    }
    for (const supplier of suppliersMock) {
      if (supplier.taxNo) expect(isTaxNoValid(supplier.taxNo)).toBe(true)
    }
    expect(suppliersMock.filter((item) => item.status === 0)).toHaveLength(3)
  })

  it('仓库恰好 5 个预置：总仓唯一且不可停用、深圳仓为停用演示', () => {
    expect(warehousesMock.map((item) => item.code)).toEqual(['WH001', 'WH002', 'WH003', 'WH004', 'WH005'])
    const headquarters = warehousesMock.filter((item) => item.isHeadquarters)
    expect(headquarters).toHaveLength(1)
    expect(headquarters[0].name).toBe('总仓')
    expect(headquarters[0].status).toBe(1)
    const shenzhen = warehousesMock.find((item) => item.name === '深圳仓')
    expect(shenzhen?.status).toBe(0)
    expect(shenzhen?.stockQuantity).toBe(0)
    // 负责人必须是真实内部员工 id 或待分配。
    const staffIds = new Set(usersMock.filter((user) => user.userType === 'staff').map((user) => user.id))
    for (const warehouse of warehousesMock) {
      if (warehouse.ownerUserId) expect(staffIds.has(warehouse.ownerUserId)).toBe(true)
    }
  })

  it('日志模块字典覆盖基础资料三个模块', () => {
    const values = LOG_MODULES.map((item) => item.value)
    expect(values).toContain('product')
    expect(values).toContain('supplier')
    expect(values).toContain('inventory')
  })
})

describe('采购申请数据集不变量', () => {
  it('申请 12 条：状态分布 2/4/2/2/2，编号唯一且 = PR + 创建日期 + 4 位流水', () => {
    expect(purchaseRequestsMock).toHaveLength(12)
    const byStatus = (status: PurchaseRequestStatus) => purchaseRequestsMock.filter((item) => item.status === status)
    expect(byStatus('draft')).toHaveLength(2)
    expect(byStatus('pending')).toHaveLength(4)
    expect(byStatus('approved')).toHaveLength(2)
    expect(byStatus('rejected')).toHaveLength(2)
    expect(byStatus('ordered')).toHaveLength(2)
    expect(new Set(purchaseRequestsMock.map((item) => item.id)).size).toBe(12)
    expect(new Set(purchaseRequestsMock.map((item) => item.code)).size).toBe(12)
    for (const item of purchaseRequestsMock) {
      expect(item.code).toMatch(/^PR\d{8}\d{4}$/)
      // 编码日期段必须与创建日期一致，流水段为正整数。
      expect(item.code.startsWith(`PR${dayjs(item.createdAt).format('YYYYMMDD')}`)).toBe(true)
      expect(Number(item.code.slice(-4))).toBeGreaterThan(0)
    }
  })

  it('下一编号 = 今天日期 + 全局最大流水 + 1', () => {
    expect(nextPurchaseRequestCode()).toBe(`PR${dayjs().format('YYYYMMDD')}0013`)
  })

  it('明细引用真实商品且不重复：行金额 = 数量 × 参考价，总额 = Σ 行金额', () => {
    for (const request of purchaseRequestsMock) {
      expect(request.items.length).toBeGreaterThan(0)
      const productIds = new Set<string>()
      for (const item of request.items) {
        const product = productsMock.find((candidate) => candidate.id === item.productId)
        expect(product).toBeDefined()
        expect(productIds.has(item.productId)).toBe(false)
        productIds.add(item.productId)
        // 快照字段与商品档案一致，参考价默认取采购参考价。
        expect(item.productCode).toBe(product!.code)
        expect(item.productName).toBe(product!.name)
        expect(item.spec).toBe(product!.spec)
        expect(item.unit).toBe(product!.unit)
        expect(item.referencePrice).toBe(product!.purchasePrice)
        expect(item.amount).toBe(Math.round(item.quantity * product!.purchasePrice * 100) / 100)
      }
      const sum = request.items.reduce((total, item) => total + item.amount, 0)
      expect(request.totalAmount).toBe(Math.round(sum * 100) / 100)
    }
  })

  it('申请人均为真实内部员工，姓名与部门随档案快照', () => {
    const staffById = new Map(usersMock.filter((user) => user.userType === 'staff').map((user) => [user.id, user]))
    for (const request of purchaseRequestsMock) {
      const staff = staffById.get(request.applicantId)
      expect(staff).toBeDefined()
      expect(request.applicantName).toBe(staff!.name)
      expect(request.department).toBe(staff!.department)
    }
  })

  it('提交时间口径：草稿（含撤回）无提交时间，其余状态必有；仅已生成订单携带订单号', () => {
    for (const request of purchaseRequestsMock) {
      if (request.status === 'draft') expect(request.submittedAt).toBeUndefined()
      else expect(request.submittedAt).toBeDefined()
      if (request.status === 'ordered') expect(request.orderedOrderCode).toBeDefined()
      else expect(request.orderedOrderCode).toBeUndefined()
    }
  })

  it('审批流水均引用有效申请、以 create 开头且时间正序，结论动作与状态一致、拒绝必附意见', () => {
    const requestById = new Map(purchaseRequestsMock.map((item) => [item.id, item]))
    const grouped = new Map<string, ApprovalRecord[]>()
    for (const record of approvalRecordsMock) {
      expect(record.businessType).toBe('purchase_request')
      expect(requestById.has(record.businessId)).toBe(true)
      const list = grouped.get(record.businessId) ?? []
      list.push(record)
      grouped.set(record.businessId, list)
    }
    // 12 条申请全有流水（draft 含撤回流水）。
    expect(grouped.size).toBe(purchaseRequestsMock.length)
    // 各状态的末笔动作：由生命周期种子决定（pending = 提交，结论 = 审批动作，draft = 创建/撤回）。
    const expectedLastActions: Record<PurchaseRequestStatus, ApprovalAction[]> = {
      draft: ['create', 'withdraw'],
      pending: ['submit'],
      approved: ['approve'],
      rejected: ['reject'],
      ordered: ['approve'],
    }
    for (const [businessId, records] of grouped) {
      expect(records[0].action).toBe('create')
      const times = records.map((record) => record.createdAt)
      expect([...times].sort()).toEqual(times)
      const request = requestById.get(businessId)!
      expect(expectedLastActions[request.status]).toContain(records[records.length - 1].action)
      for (const record of records) {
        if (record.action === 'reject') expect(record.comment).toBeTruthy()
      }
    }
  })
})

describe('审批中心数据集不变量', () => {
  it('结论流水 6 条（通过 4 / 拒绝 2），结论人非申请人，且 admin 名下有演示结论', () => {
    const requestById = new Map(purchaseRequestsMock.map((item) => [item.id, item]))
    const conclusions = approvalRecordsMock.filter(
      (record) => record.action === 'approve' || record.action === 'reject',
    )
    expect(conclusions.filter((record) => record.action === 'approve')).toHaveLength(4)
    expect(conclusions.filter((record) => record.action === 'reject')).toHaveLength(2)
    // 演示管理员（admin）登录后「我已审批」必须有真实数据可看。
    const admin = usersMock.find((user) => user.username === 'admin')
    expect(admin).toBeDefined()
    expect(conclusions.some((record) => record.operatorId === admin!.id)).toBe(true)
    // 轮换必须跨申请全局推进（序号不能在单条申请内重置），覆盖至少 3 位审批人。
    expect(new Set(conclusions.map((record) => record.operatorId)).size).toBeGreaterThanOrEqual(3)
    for (const record of conclusions) {
      const request = requestById.get(record.businessId)!
      // 先到先审：审批结论人不能是申请人自己。
      expect(record.operatorId).not.toBe(request.applicantId)
      // 结论与单据状态自洽：approve → 已通过 / 已生成订单，reject → 已拒绝。
      if (record.action === 'approve') expect(['approved', 'ordered']).toContain(request.status)
      else expect(request.status).toBe('rejected')
    }
  })
})
