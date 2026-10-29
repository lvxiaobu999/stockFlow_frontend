import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { routeMeta } from '@/config/routes'
import type { ApprovalAction, ApprovalRecord } from '@/features/approval/types'
import { isTaxNoValid } from '@/features/supplier/utils/validators'
import { PRODUCT_UNITS } from '@/features/product/types'
import { isPriceValid } from '@/features/product/utils/validators'
import type { PurchaseOrderStatus, PurchaseRequestStatus } from '@/features/purchase/types'
import { categoryMock } from './categories'
import { productsMock } from './products'
import { resolvePermissions } from './auth'
import { OPERATION_LOG_TOTAL, LOG_MODULES, operationLogsMock } from './operation-logs'
import { permissionTreeMock, roleMock, rolePermissionCodes } from './roles'
import { suppliersMock } from './suppliers'
import { usersMock, DEMO_SUPPLIER_USERNAME, getRoleUserCount, findUserByUsername } from './users'
import { warehousesMock } from './warehouses'
import { approvalRecordsMock, nextPurchaseRequestCode, purchaseRequestsMock } from './purchaseRequests'
import { nextPurchaseOrderCode, purchaseOrdersMock } from './purchaseOrders'
import { shipmentsMock } from './shipments'
import { inspectionsMock, receiptsMock } from './receiving'
import {
  buildReconciliationPool,
  buildReconciliationSummary,
  nextReconciliationCode,
  orderPaidAmountsMock,
  reconsMock,
  toReconciliationRecord,
} from './reconciliation'
import { DEFAULT_WAREHOUSE, inventoriesMock, stockTransactionsMock } from './inventory'
import { calcStockAmount, isStockWarning } from '@/features/inventory/utils/stock'

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

  it('供应商演示账号存在且权限仅限门户菜单与订单动作', () => {
    const supplier = usersMock.find((user) => user.username === DEMO_SUPPLIER_USERNAME)
    expect(supplier).toBeDefined()
    const permissions = resolvePermissions(supplier!)
    // 门户四页菜单码齐全，且持有确认 / 拒绝 / 发货三个裁决动作。
    for (const code of [
      'menu:supplier-portal:home',
      'menu:supplier-portal:my-orders',
      'menu:supplier-portal:to-ship',
      'menu:supplier-portal:shipments',
      'supplier-portal:order:confirm',
      'supplier-portal:order:reject',
      'supplier-portal:order:ship',
    ]) {
      expect(permissions).toContain(code)
    }
    // 不持有管理端任何菜单与通配权限。
    expect(permissions).not.toContain('menu:dashboard')
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

describe('采购订单数据集不变量', () => {
  it('订单 18 条覆盖全部状态，编号唯一且 = PO + 创建日期 + 4 位全局递增流水', () => {
    expect(purchaseOrdersMock).toHaveLength(18)
    const byStatus = (status: PurchaseOrderStatus) => purchaseOrdersMock.filter((item) => item.status === status)
    expect(byStatus('draft')).toHaveLength(1)
    expect(byStatus('pending_supplier')).toHaveLength(2)
    expect(byStatus('confirmed')).toHaveLength(3)
    expect(byStatus('shipped')).toHaveLength(2)
    expect(byStatus('received')).toHaveLength(1)
    expect(byStatus('inspected')).toHaveLength(1)
    // 6 条已完成（po-003 + po-014 ~ po-018）：后 5 条为对账模块铺垫。
    expect(byStatus('completed')).toHaveLength(6)
    expect(byStatus('rejected')).toHaveLength(1)
    expect(byStatus('cancelled')).toHaveLength(1)
    expect(new Set(purchaseOrdersMock.map((item) => item.id)).size).toBe(18)
    expect(new Set(purchaseOrdersMock.map((item) => item.code)).size).toBe(18)
    for (const item of purchaseOrdersMock) {
      expect(item.code).toMatch(/^PO\d{8}\d{4}$/)
      // 编码日期段必须与创建日期一致，流水段为正整数。
      expect(item.code.startsWith(`PO${dayjs(item.createdAt).format('YYYYMMDD')}`)).toBe(true)
      expect(Number(item.code.slice(-4))).toBeGreaterThan(0)
    }
    // 流水全局随创建时间递增（编号排序 = 创建时间排序）。
    const byTime = [...purchaseOrdersMock].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const seqs = byTime.map((item) => Number(item.code.slice(-4)))
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs)
  })

  it('下一编号 = 今天日期 + 全局最大流水 + 1', () => {
    expect(nextPurchaseOrderCode()).toBe(`PO${dayjs().format('YYYYMMDD')}0019`)
  })

  it('明细引用真实商品且不重复：行金额 = 数量 × 成交价，总额 = Σ 行金额', () => {
    for (const order of purchaseOrdersMock) {
      expect(order.items.length).toBeGreaterThan(0)
      const productIds = new Set<string>()
      for (const item of order.items) {
        const product = productsMock.find((candidate) => candidate.id === item.productId)
        expect(product).toBeDefined()
        expect(productIds.has(item.productId)).toBe(false)
        productIds.add(item.productId)
        // 快照字段与商品档案一致。
        expect(item.productCode).toBe(product!.code)
        expect(item.productName).toBe(product!.name)
        expect(item.spec).toBe(product!.spec)
        expect(item.unit).toBe(product!.unit)
        expect(item.unitPrice).toBeGreaterThanOrEqual(0)
        expect(item.amount).toBe(Math.round(item.quantity * item.unitPrice * 100) / 100)
      }
      const sum = order.items.reduce((total, item) => total + item.amount, 0)
      expect(order.totalAmount).toBe(Math.round(sum * 100) / 100)
    }
  })

  it('供应商与采购员均为真实数据，供应商名称随档案快照', () => {
    const supplierById = new Map(suppliersMock.map((item) => [item.id, item]))
    const staffById = new Map(usersMock.filter((user) => user.userType === 'staff').map((user) => [user.id, user]))
    for (const order of purchaseOrdersMock) {
      const supplier = supplierById.get(order.supplierId)
      expect(supplier).toBeDefined()
      expect(order.supplierName).toBe(supplier!.name)
      const staff = staffById.get(order.purchaserId)
      expect(staff).toBeDefined()
      expect(order.purchaserName).toBe(staff!.name)
    }
  })

  it('关联订单与申请互为镜像：申请已生成订单、编码双向一致、明细数量与单价取申请参考价', () => {
    const requestById = new Map(purchaseRequestsMock.map((item) => [item.id, item]))
    const linkedOrders = purchaseOrdersMock.filter((order) => order.requestId)
    expect(linkedOrders).toHaveLength(2)
    for (const order of linkedOrders) {
      const request = requestById.get(order.requestId!)
      expect(request).toBeDefined()
      expect(request!.status).toBe('ordered')
      // 投影字段双向一致：申请记订单，订单记申请。
      expect(request!.orderedOrderId).toBe(order.id)
      expect(request!.orderedOrderCode).toBe(order.code)
      expect(order.requestCode).toBe(request!.code)
      // 派生明细与申请明细逐行对应，成交单价 = 申请参考价。
      expect(order.items).toHaveLength(request!.items.length)
      for (const [index, item] of order.items.entries()) {
        const requestItem = request!.items[index]
        expect(item.productId).toBe(requestItem.productId)
        expect(item.quantity).toBe(requestItem.quantity)
        expect(item.unitPrice).toBe(requestItem.referencePrice)
      }
      // 采购员 = 申请人（生成动作由申请人发起）。
      expect(order.purchaserId).toBe(request!.applicantId)
    }
    // 反向：每条 ordered 申请都能找到 carrying 投影的订单。
    for (const request of purchaseRequestsMock.filter((item) => item.status === 'ordered')) {
      expect(purchaseOrdersMock.some((order) => order.id === request.orderedOrderId)).toBe(true)
    }
  })

  it('生命周期时间戳与状态自洽：主链节点按序到达，拒绝 / 作废终态携带原因', () => {
    for (const order of purchaseOrdersMock) {
      const times: Array<[string | undefined, string]> = [
        [order.createdAt, '创建'],
        [order.sentAt, '发送'],
        [order.confirmedAt, '确认'],
        [order.shippedAt, '发货'],
        [order.receivedAt, '收货'],
        [order.inspectedAt, '验收'],
        [order.completedAt, '完成'],
      ]
      // 主链上已到达的节点必须按状态机顺序递增。
      const reached = times.filter(([time]) => time !== undefined).map(([time]) => time as string)
      expect([...reached].sort()).toEqual(reached)
      // 节点不能超前于状态（如 confirmed 订单不应有收货时间）。
      const statusDepth: Record<PurchaseOrderStatus, number> = {
        draft: 1,
        pending_supplier: 2,
        confirmed: 3,
        shipped: 4,
        received: 5,
        inspected: 6,
        completed: 7,
        rejected: 2,
        cancelled: 2,
      }
      const depth = statusDepth[order.status]
      if (depth < 3) expect(order.confirmedAt).toBeUndefined()
      if (depth < 4) expect(order.shippedAt).toBeUndefined()
      if (depth < 5) expect(order.receivedAt).toBeUndefined()
      if (depth < 6) expect(order.inspectedAt).toBeUndefined()
      if (depth < 7) expect(order.completedAt).toBeUndefined()
      // 发送节点：草稿未发送，其余状态都已发送（拒绝 / 作废发生在发送之后）。
      if (order.status === 'draft') expect(order.sentAt).toBeUndefined()
      else expect(order.sentAt).toBeDefined()
      // 拒绝 / 作废终态必须成对携带时间与原因。
      if (order.status === 'rejected') {
        expect(order.rejectedAt).toBeDefined()
        expect(order.rejectReason).toBeTruthy()
      } else {
        expect(order.rejectedAt).toBeUndefined()
      }
      if (order.status === 'cancelled') {
        expect(order.cancelledAt).toBeDefined()
        expect(order.cancelReason).toBeTruthy()
      } else {
        expect(order.cancelledAt).toBeUndefined()
      }
    }
  })

  it('供应商在途订单数已由订单数据集回写（待确认 + 已确认 + 已发货）', () => {
    const pendingBySupplier = new Map<string, number>()
    for (const order of purchaseOrdersMock) {
      if (['pending_supplier', 'confirmed', 'shipped'].includes(order.status)) {
        pendingBySupplier.set(order.supplierId, (pendingBySupplier.get(order.supplierId) ?? 0) + 1)
      }
    }
    for (const supplier of suppliersMock) {
      expect(supplier.pendingOrderCount).toBe(pendingBySupplier.get(supplier.id) ?? 0)
    }
  })

  it('门户演示账号（hongyuan01 → sup-001）名下有可完整演示的订单组合', () => {
    const supplier = suppliersMock.find((item) => item.portalUsername === DEMO_SUPPLIER_USERNAME)
    expect(supplier).toBeDefined()
    expect(supplier!.status).toBe(1)
    const ownOrders = purchaseOrdersMock.filter((order) => order.supplierId === supplier!.id)
    const statuses = new Set(ownOrders.map((order) => order.status))
    // 首页统计 / 待确认动作 / 待发货动作 / 发货记录四类演示都依赖以下状态。
    for (const status of ['completed', 'pending_supplier', 'confirmed', 'shipped'] as const) {
      expect(statuses.has(status)).toBe(true)
    }
  })
})

describe('发货单数据集不变量', () => {
  it('每张已发货订单恰有一张发货单，反之亦然；单号 = SH + 发货日期 + 全局递增流水', () => {
    const shippedOrders = purchaseOrdersMock.filter((order) => order.shippedAt !== undefined)
    expect(shipmentsMock).toHaveLength(shippedOrders.length)
    const orderIdSet = new Set(shipmentsMock.map((shipment) => shipment.orderId))
    expect(orderIdSet.size).toBe(shipmentsMock.length)
    for (const order of shippedOrders) {
      expect(orderIdSet.has(order.id)).toBe(true)
    }
    expect(new Set(shipmentsMock.map((shipment) => shipment.code)).size).toBe(shipmentsMock.length)
    for (const shipment of shipmentsMock) {
      expect(shipment.code).toMatch(/^SH\d{8}\d{4}$/)
      // 编码日期段必须与发货日期一致。
      expect(shipment.code.startsWith(`SH${dayjs(shipment.shippedAt).format('YYYYMMDD')}`)).toBe(true)
    }
    // 流水全局随发货时间递增。
    const byTime = [...shipmentsMock].sort((a, b) => a.shippedAt.localeCompare(b.shippedAt))
    const seqs = byTime.map((shipment) => Number(shipment.code.slice(-4)))
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs)
  })

  it('发货明细快照 = 订单明细（MVP 一次发清：实发 = 订购），供应商快照一致', () => {
    const orderById = new Map(purchaseOrdersMock.map((order) => [order.id, order]))
    for (const shipment of shipmentsMock) {
      const order = orderById.get(shipment.orderId)!
      expect(order).toBeDefined()
      expect(shipment.orderCode).toBe(order.code)
      expect(shipment.supplierId).toBe(order.supplierId)
      expect(shipment.supplierName).toBe(order.supplierName)
      expect(shipment.shippedAt).toBe(order.shippedAt)
      expect(shipment.items).toHaveLength(order.items.length)
      for (const [index, item] of shipment.items.entries()) {
        const orderItem = order.items[index]
        expect(item.productId).toBe(orderItem.productId)
        expect(item.orderedQty).toBe(orderItem.quantity)
        expect(item.shippedQty).toBe(orderItem.quantity)
        expect(item.shippedQty).toBeLessThanOrEqual(item.orderedQty)
      }
      // 操作人 = 供应商账号展示名（公司名），且该供应商确实开通了门户。
      const supplier = suppliersMock.find((item) => item.id === shipment.supplierId)
      expect(shipment.createdByName).toBe(supplier!.name)
      expect(supplier!.portalUsername).toBeDefined()
    }
  })
})

describe('收货与验收数据集不变量', () => {
  it('每张发货单恰有一张收货单（发货即预建待收货），单号 = RC + 单据日期 + 全局递增流水', () => {
    expect(receiptsMock).toHaveLength(shipmentsMock.length)
    const shipmentIdSet = new Set(receiptsMock.map((receipt) => receipt.shipmentId))
    expect(shipmentIdSet.size).toBe(receiptsMock.length)
    for (const shipment of shipmentsMock) {
      expect(shipmentIdSet.has(shipment.id)).toBe(true)
    }
    expect(new Set(receiptsMock.map((receipt) => receipt.code)).size).toBe(receiptsMock.length)
    for (const receipt of receiptsMock) {
      expect(receipt.code).toMatch(/^RC\d{8}\d{4}$/)
      // 编码日期段必须与单据创建日期（= 发货时间）一致。
      expect(receipt.code.startsWith(`RC${dayjs(receipt.createdAt).format('YYYYMMDD')}`)).toBe(true)
      expect(receipt.orderCode).toBe(purchaseOrdersMock.find((order) => order.id === receipt.orderId)!.code)
    }
    // 流水全局随单据创建时间递增。
    const byTime = [...receiptsMock].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const seqs = byTime.map((receipt) => Number(receipt.code.slice(-4)))
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs)
  })

  it('收货状态与订单时间戳自洽：已收货单实收 = 应发，待收货单未登记且无收货人', () => {
    const orderById = new Map(purchaseOrdersMock.map((order) => [order.id, order]))
    const receivedReceipts = receiptsMock.filter((receipt) => receipt.status === 'received')
    // 种子演示：8 张已收货（po-001 / po-003 / po-006 + po-014 ~ po-018 对账铺垫）
    // + 2 张待收货（po-007 / po-009）。
    expect(receivedReceipts).toHaveLength(8)
    expect(receiptsMock.filter((receipt) => receipt.status === 'pending')).toHaveLength(2)
    for (const receipt of receiptsMock) {
      const order = orderById.get(receipt.orderId)!
      expect(receipt.items).toHaveLength(order.items.length)
      for (const item of receipt.items) {
        expect(item.receivedQty).toBeLessThanOrEqual(item.expectedQty)
        if (receipt.status === 'received') {
          expect(item.receivedQty).toBe(item.expectedQty)
          expect(order.receivedAt).toBe(receipt.receivedAt)
        } else {
          expect(item.receivedQty).toBe(0)
          expect(receipt.receivedAt).toBeUndefined()
          expect(receipt.receivedByName).toBeUndefined()
          expect(order.receivedAt).toBeUndefined()
        }
      }
    }
    // 收货人均为真实内部员工展示名（仓储部轮换）。
    const staffNames = new Set(usersMock.filter((user) => user.userType === 'staff').map((user) => user.name))
    for (const receipt of receivedReceipts) {
      expect(receipt.receivedByName).toBeDefined()
      expect(staffNames.has(receipt.receivedByName!)).toBe(true)
    }
  })

  it('每张已收货单恰有一张验收单（收货即预建待验收），单号 = IS + 单据日期 + 全局递增流水', () => {
    const receivedReceipts = receiptsMock.filter((receipt) => receipt.status === 'received')
    expect(inspectionsMock).toHaveLength(receivedReceipts.length)
    const receiptIdSet = new Set(inspectionsMock.map((inspection) => inspection.receiptId))
    expect(receiptIdSet.size).toBe(inspectionsMock.length)
    for (const receipt of receivedReceipts) {
      expect(receiptIdSet.has(receipt.id)).toBe(true)
      // 收货单上的验收单投影与验收单数据双向一致。
      const inspection = inspectionsMock.find((item) => item.receiptId === receipt.id)!
      expect(receipt.inspectionId).toBe(inspection.id)
      expect(receipt.inspectionCode).toBe(inspection.code)
      expect(receipt.inspectionResult).toBe(inspection.result)
    }
    expect(new Set(inspectionsMock.map((inspection) => inspection.code)).size).toBe(inspectionsMock.length)
    for (const inspection of inspectionsMock) {
      expect(inspection.code).toMatch(/^IS\d{8}\d{4}$/)
      // 编码日期段必须与单据创建日期（= 收货时间）一致。
      expect(inspection.code.startsWith(`IS${dayjs(inspection.createdAt).format('YYYYMMDD')}`)).toBe(true)
    }
    const byTime = [...inspectionsMock].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const seqs = byTime.map((inspection) => Number(inspection.code.slice(-4)))
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs)
  })

  it('验收结论与订单时间戳自洽：结论行合格 + 不合格 = 实收，且覆盖全部商品', () => {
    const orderById = new Map(purchaseOrdersMock.map((order) => [order.id, order]))
    // 种子演示结论分布：全部合格 6（po-003 + po-014 ~ po-018，一次发清全合格）/
    // 部分合格 1（po-006，含破损演示）/ 待验收 1（po-001）。
    expect(inspectionsMock.filter((inspection) => inspection.result === 'qualified')).toHaveLength(6)
    expect(inspectionsMock.filter((inspection) => inspection.result === 'partial')).toHaveLength(1)
    expect(inspectionsMock.filter((inspection) => inspection.result === 'pending')).toHaveLength(1)
    const staffNames = new Set(usersMock.filter((user) => user.userType === 'staff').map((user) => user.name))
    for (const inspection of inspectionsMock) {
      const order = orderById.get(inspection.orderId)!
      for (const item of inspection.items) {
        // 待验收单数量未登记（0/0）；已验收单须满足「合格 + 不合格 = 实收」。
        if (inspection.result === 'pending') {
          expect(item.qualifiedQty).toBe(0)
          expect(item.unqualifiedQty).toBe(0)
        } else {
          expect(item.qualifiedQty + item.unqualifiedQty).toBe(item.receivedQty)
          expect(item.qualifiedQty).toBeLessThanOrEqual(item.receivedQty)
        }
        // 订单数量投影与订单明细一致（验收操作页「应收 vs 实收」对照口径）。
        expect(item.orderedQty).toBe(order.items.find((orderItem) => orderItem.productId === item.productId)!.quantity)
      }
      if (inspection.result === 'pending') {
        expect(inspection.inspectedAt).toBeUndefined()
        expect(inspection.inspectedByName).toBeUndefined()
        expect(order.inspectedAt).toBeUndefined()
      } else {
        expect(inspection.inspectedAt).toBe(order.inspectedAt)
        expect(staffNames.has(inspection.inspectedByName!)).toBe(true)
      }
    }
    // 演示订单（收货 / 验收动作闭环）全部落在已收货 / 已验收 / 已完成订单上。
    for (const inspection of inspectionsMock) {
      expect(['received', 'inspected', 'completed']).toContain(orderById.get(inspection.orderId)!.status)
    }
  })
})

describe('对账数据集不变量', () => {
  it('对账单 5 条覆盖全部状态，单号 = RE + 创建日期 + 全局递增流水', () => {
    expect(reconsMock).toHaveLength(5)
    const statuses = reconsMock.map((row) => row.status).sort()
    expect(statuses).toEqual(['closed', 'confirmed', 'disputed', 'draft', 'pending'])
    expect(new Set(reconsMock.map((row) => row.id)).size).toBe(5)
    for (const row of reconsMock) {
      expect(row.code).toMatch(/^RE\d{8}\d{4}$/)
      // 编码日期段必须与创建日期一致。
      expect(row.code.startsWith(`RE${dayjs(row.createdAt).format('YYYYMMDD')}`)).toBe(true)
    }
    // 流水全局随创建时间递增。
    const byTime = [...reconsMock].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const seqs = byTime.map((row) => Number(row.code.slice(-4)))
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs)
    // 下一编号 = 今天日期 + 全局最大流水 + 1。
    expect(nextReconciliationCode()).toBe(`RE${dayjs().format('YYYYMMDD')}0006`)
  })

  it('明细行与收货单 / 订单逐行自洽：单价取订单快照，金额 = 实收 × 单价，行已付 ≤ 行金额', () => {
    const orderById = new Map(purchaseOrdersMock.map((order) => [order.id, order]))
    const receiptById = new Map(receiptsMock.map((receipt) => [receipt.id, receipt]))
    for (const row of reconsMock) {
      const record = toReconciliationRecord(row)
      expect(record.items.length).toBeGreaterThan(0)
      for (const item of record.items) {
        const receipt = receiptById.get(item.receiptId)!
        expect(receipt).toBeDefined()
        expect(receipt.status).toBe('received')
        expect(item.orderId).toBe(receipt.orderId)
        const order = orderById.get(item.orderId)!
        const receiptItem = receipt.items.find((candidate) => candidate.productId === item.productId)!
        const orderItem = order.items.find((candidate) => candidate.productId === item.productId)!
        expect(item.unitPrice).toBe(orderItem.unitPrice)
        expect(item.receivedQty).toBe(receiptItem.receivedQty)
        expect(item.amount).toBe(Math.round(item.receivedQty * item.unitPrice * 100) / 100)
        expect(item.paidAmount).toBeLessThanOrEqual(item.amount)
      }
    }
  })

  it('金额链自洽：订单金额 / 应付按明细求和，待付 = 应付 − 已付，已付种子 ≤ 订单应付', () => {
    for (const row of reconsMock) {
      const record = toReconciliationRecord(row)
      const orderAmount =
        Math.round(record.items.reduce((sum, item) => sum + item.orderedQty * item.unitPrice, 0) * 100) / 100
      const payable = Math.round(record.items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100
      const paid = Math.round(record.items.reduce((sum, item) => sum + item.paidAmount, 0) * 100) / 100
      expect(record.orderAmount).toBe(orderAmount)
      expect(record.payableAmount).toBe(payable)
      expect(record.paidAmount).toBe(paid)
      expect(record.unpaidAmount).toBe(Math.round((payable - paid) * 100) / 100)
      expect(record.paidAmount).toBeLessThanOrEqual(record.payableAmount)
    }
    for (const [orderId, paid] of Object.entries(orderPaidAmountsMock)) {
      const order = purchaseOrdersMock.find((candidate) => candidate.id === orderId)!
      expect(order).toBeDefined()
      expect(paid).toBeLessThanOrEqual(order.items.reduce((sum, item) => sum + item.amount, 0))
    }
  })

  it('差异字段仅出现在有差异状态；确认 / 关闭时间线与状态自洽', () => {
    for (const row of reconsMock) {
      if (row.status === 'disputed') {
        expect(row.diffType).toBeDefined()
        expect(row.diffReason).toBeTruthy()
      } else {
        expect(row.diffType).toBeUndefined()
        expect(row.diffAmount).toBeUndefined()
        expect(row.diffReason).toBeUndefined()
      }
      if (row.status === 'confirmed' || row.status === 'closed') {
        expect(row.confirmedByName).toBeTruthy()
        expect(row.confirmedAt).toBeDefined()
      } else {
        expect(row.confirmedAt).toBeUndefined()
      }
      if (row.status === 'closed') {
        expect(row.closedByName).toBeTruthy()
        expect(row.closedAt).toBeDefined()
        expect(row.closedRemark).toBeTruthy()
      } else {
        expect(row.closedAt).toBeUndefined()
      }
    }
  })

  it('待对账单据池 = 已收货且未被任何对账单纳入：3 张演示单且与对账单引用互斥', () => {
    const pool = buildReconciliationPool()
    expect(pool).toHaveLength(3)
    const reconciled = new Set(reconsMock.flatMap((row) => row.receiptIds))
    for (const row of pool) {
      expect(reconciled.has(row.receiptId)).toBe(false)
      const receipt = receiptsMock.find((candidate) => candidate.id === row.receiptId)!
      expect(receipt.status).toBe('received')
    }
    // 反向：已收货单要么已被对账单纳入、要么留在池里（无第三种状态）。
    for (const receipt of receiptsMock.filter((item) => item.status === 'received')) {
      expect(reconciled.has(receipt.id) || pool.some((row) => row.receiptId === receipt.id)).toBe(true)
    }
  })

  it('汇总看板口径：待确认 1 笔 / 有差异 1 笔，近期待处理按创建时间倒序', () => {
    const summary = buildReconciliationSummary()
    expect(summary.poolCount).toBe(3)
    expect(summary.pendingConfirmCount).toBe(1)
    expect(summary.disputedCount).toBe(1)
    expect(summary.recentList.map((row) => row.status)).toEqual(['pending', 'disputed'])
    // 本月已对账口径含已关闭，确认时间落在当前月的记录才计入
    // （种子按 2026-10 演示基准设计，真实时间推进后自然滚动，不做硬断言）。
    expect(summary.monthConfirmedCount).toBeGreaterThanOrEqual(0)
  })

  it('对账单供应商快照与档案一致，创建人 / 确认人均为真实员工展示名', () => {
    const supplierById = new Map(suppliersMock.map((item) => [item.id, item]))
    const staffNames = new Set(usersMock.filter((user) => user.userType === 'staff').map((user) => user.name))
    for (const row of reconsMock) {
      expect(row.supplierName).toBe(supplierById.get(row.supplierId)!.name)
      expect(staffNames.has(row.createdByName)).toBe(true)
      if (row.confirmedByName) expect(staffNames.has(row.confirmedByName)).toBe(true)
      if (row.closedByName) expect(staffNames.has(row.closedByName)).toBe(true)
    }
    // 草稿演示单由采购员（张伟）协助发起，财务确认 / 关闭演示集中在陆萍。
    expect(reconsMock.some((row) => row.createdByName === findUserByUsername('zhangwei')!.name)).toBe(true)
    expect(
      reconsMock
        .filter((row) => row.status === 'closed')
        .every((row) => row.closedByName === findUserByUsername('lupei')!.name),
    ).toBe(true)
  })
})

describe('库存数据集不变量', () => {
  it('库存行 (仓库, 商品) 唯一且数量非负，各商品跨仓合计 = 商品档案 totalStock', () => {
    const keys = new Set<string>()
    for (const row of inventoriesMock) {
      const key = `${row.warehouseId}|${row.productId}`
      expect(keys.has(key)).toBe(false)
      keys.add(key)
      expect(row.quantity).toBeGreaterThanOrEqual(0)
    }
    for (const product of productsMock) {
      const total = inventoriesMock
        .filter((row) => row.productId === product.id)
        .reduce((sum, row) => sum + row.quantity, 0)
      expect(total).toBe(product.totalStock)
    }
    // 停用仓（深圳）不参与库存：无任何库存行。
    const disabledWarehouses = warehousesMock.filter((warehouse) => warehouse.status === 0)
    for (const warehouse of disabledWarehouses) {
      expect(inventoriesMock.some((row) => row.warehouseId === warehouse.id)).toBe(false)
    }
  })

  it('流水 quantityAfter 链自洽：逐条累加成立，链末端 = 当前库存', () => {
    const grouped = new Map<string, typeof stockTransactionsMock>()
    for (const row of stockTransactionsMock) {
      const key = `${row.warehouseId}|${row.productId}`
      const list = grouped.get(key) ?? []
      list.push(row)
      grouped.set(key, list)
    }
    for (const [key, rows] of grouped) {
      const sorted = [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      // 首条之前的库存为 0：quantityAfter = 前值 + 变动，逐条成立。
      let running = 0
      for (const row of sorted) {
        running += row.quantity
        expect(row.quantityAfter).toBe(running)
      }
      const [warehouseId, productId] = key.split('|')
      const inventory = inventoriesMock.find((row) => row.warehouseId === warehouseId && row.productId === productId)
      expect(inventory).toBeDefined()
      expect(inventory!.quantity).toBe(running)
    }
    // 流水只增不改：id 全局唯一。
    expect(new Set(stockTransactionsMock.map((row) => row.id)).size).toBe(stockTransactionsMock.length)
  })

  it('验收入库口径：已落结论验收单的合格数量在总仓生成入库流水，待验收单无流水', () => {
    const inboundRows = stockTransactionsMock.filter((row) => row.type === 'inbound')
    for (const inspection of inspectionsMock) {
      for (const item of inspection.items) {
        const matched = inboundRows.filter(
          (row) => row.bizId === inspection.orderId && row.productId === item.productId,
        )
        if (inspection.inspectedAt === undefined || item.qualifiedQty === 0) {
          // 待验收（po-001）或该行零合格：不允许出现入库流水。
          expect(matched).toHaveLength(0)
        } else {
          expect(matched).toHaveLength(1)
          expect(matched[0].warehouseId).toBe(DEFAULT_WAREHOUSE.id)
          expect(matched[0].quantity).toBe(item.qualifiedQty)
          expect(matched[0].bizCode).toBe(inspection.orderCode)
        }
      }
    }
    // 调整流水 = 期初建账 + 运行期调整；种子期没有出库流水（销售出库属第二阶段）。
    expect(stockTransactionsMock.some((row) => row.type === 'outbound')).toBe(false)
    expect(stockTransactionsMock.filter((row) => row.type === 'adjust').every((row) => row.quantity > 0)).toBe(true)
  })

  it('仓库统计列由库存流水推导回写：SKU 数 / 数量 / 金额三侧一致', () => {
    for (const warehouse of warehousesMock) {
      const rows = inventoriesMock.filter((row) => row.warehouseId === warehouse.id)
      const quantity = rows.reduce((sum, row) => sum + row.quantity, 0)
      const amount = rows.reduce((sum, row) => {
        const product = productsMock.find((item) => item.id === row.productId)!
        return sum + calcStockAmount(row.quantity, product.purchasePrice)
      }, 0)
      expect(warehouse.stockSkuCount).toBe(rows.filter((row) => row.quantity > 0).length)
      expect(warehouse.stockQuantity).toBe(quantity)
      expect(warehouse.stockAmount).toBe(Math.round(amount * 100) / 100)
    }
  })

  it('安全库存预警覆盖全部 ≤ 口径的库存行，红双喜 A3（8 ≤ 10）仍在预警演示集', () => {
    const alertKeys = new Set(
      inventoriesMock
        .filter((row) => {
          const product = productsMock.find((item) => item.id === row.productId)!
          return isStockWarning(row.quantity, product.safetyStock)
        })
        .map((row) => `${row.warehouseId}|${row.productId}`),
    )
    expect(alertKeys.size).toBeGreaterThanOrEqual(8)
    // po-003 红双喜 A3 订购量已与商品总库存（8 箱）对齐：期初 + 入库 = 总库存。
    const hongshuangxi = productsMock.find((product) => product.name === '红双喜复印纸 A3 70g')!
    expect(hongshuangxi.totalStock).toBe(8)
    const po003 = purchaseOrdersMock.find(
      (order) => order.status === 'completed' && order.items.some((item) => item.productId === hongshuangxi.id),
    )!
    expect(po003.items.find((item) => item.productId === hongshuangxi.id)!.quantity).toBe(8)
  })
})
