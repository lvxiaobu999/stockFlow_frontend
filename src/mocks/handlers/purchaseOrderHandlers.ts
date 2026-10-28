import dayjs from 'dayjs'
import { delay, http } from 'msw'
import type {
  PurchaseOrderListParams,
  PurchaseOrderRecord,
  PurchaseOrderStatus,
  SavePurchaseOrderPayload,
} from '@/features/purchase/types'
import { calcItemAmount } from '@/features/purchase/utils/purchaseRequest'
import { calcOrderTotalAmount } from '@/features/purchase/utils/purchaseOrder'
import { getMockSession } from '@/mocks/data/auth'
import { appendLog } from '@/mocks/data/operation-logs'
import { nextPurchaseOrderCode, purchaseOrdersMock, syncSupplierPendingOrderCounts } from '@/mocks/data/purchaseOrders'
import { purchaseRequestsMock } from '@/mocks/data/purchaseRequests'
import { findProductById, productsMock } from '@/mocks/data/products'
import { suppliersMock } from '@/mocks/data/suppliers'
import { paginate } from '@/mocks/pagination'
import { businessError, httpError, ok } from '@/mocks/utils'

/**
 * 采购订单错误码分段（46xx）：4601 不存在、4602 状态不允许、4603 明细不合法、
 * 4604 供应商不可用、4605 来源申请不可用；通用段沿用 40xx（4001 参数缺失）。
 */
const ORDER_NOT_FOUND = 4601
const STATUS_NOT_ALLOWED = 4602
const ITEMS_INVALID = 4603
const SUPPLIER_UNAVAILABLE = 4604
const SOURCE_REQUEST_INVALID = 4605

/** 解析查询参数为列表过滤条件（MSW 的 URL 参数均为字符串）。 */
function parseParams(url: URL): PurchaseOrderListParams & { pageSize: number } {
  const current = Number(url.searchParams.get('current') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
  const status = url.searchParams.get('status')
  return {
    keyword: url.searchParams.get('keyword') ?? undefined,
    status: (status || undefined) as PurchaseOrderStatus | undefined,
    supplierId: url.searchParams.get('supplierId') ?? undefined,
    createdFrom: url.searchParams.get('createdFrom') ?? undefined,
    createdTo: url.searchParams.get('createdTo') ?? undefined,
    current,
    pageSize,
  }
}

/** 按列表参数过滤订单：keyword 匹配订单编号 / 来源申请编码；时间范围匹配创建日期。 */
function filterOrders(params: PurchaseOrderListParams): PurchaseOrderRecord[] {
  const keyword = params.keyword?.trim()
  return purchaseOrdersMock.filter((record) => {
    if (keyword && !`${record.code}${record.requestCode ?? ''}`.includes(keyword)) return false
    if (params.status && record.status !== params.status) return false
    if (params.supplierId && record.supplierId !== params.supplierId) return false
    const createdDate = record.createdAt.slice(0, 10)
    if (params.createdFrom && createdDate < params.createdFrom) return false
    if (params.createdTo && createdDate > params.createdTo) return false
    return true
  })
}

/**
 * 校验保存载荷并返回业务错误（null 表示通过）。
 *
 * 明细校验与采购申请同口径：非空、数量为正整数、成交单价非负、
 * 商品存在且启用、同一商品不重复（重复行会让收货 / 对账金额产生歧义）。
 */
function findItemsError(payload: Partial<SavePurchaseOrderPayload>) {
  if (!payload.items || payload.items.length === 0) {
    return businessError(ITEMS_INVALID, '请至少添加一条订单明细')
  }
  for (const item of payload.items) {
    const product = findProductById(item.productId)
    if (!product || product.status === 0) return businessError(ITEMS_INVALID, '明细中包含不存在或已停用的商品')
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return businessError(ITEMS_INVALID, `商品 ${product.name} 的数量必须为正整数`)
    }
    if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice < 0) {
      return businessError(ITEMS_INVALID, `商品 ${product.name} 的成交单价不合法`)
    }
  }
  const productIds = payload.items.map((item) => item.productId)
  if (new Set(productIds).size !== productIds.length) {
    return businessError(ITEMS_INVALID, '同一商品在明细中重复出现，请合并数量')
  }
  return null
}

/** 按载荷构建明细快照：商品档案字段取自商品表，行金额服务端计算。 */
function buildItems(id: string, payload: SavePurchaseOrderPayload): PurchaseOrderRecord['items'] {
  return payload.items.map((item, index) => {
    const product = productsMock.find((candidate) => candidate.id === item.productId)
    if (!product) throw new Error(`明细引用了不存在的商品：${item.productId}`)
    return {
      id: `${id}-item-${index + 1}`,
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      spec: product.spec,
      unit: product.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: calcItemAmount(item.quantity, item.unitPrice),
      remark: item.remark,
    }
  })
}

/** 采购订单审计日志便捷封装（模块固定为采购管理）。 */
function logPurchase(operator: string, action: string, targetSummary: string): void {
  appendLog({ operator, module: 'purchase', action, targetSummary })
}

/**
 * 联动回退来源申请：订单被删除 / 作废后，申请从「已生成订单」回到「已通过」，
 * 并清空订单投影，采购员可重新选供应商生成新订单（需求：供应商拒绝后可重新下单）。
 * 仅当申请仍指向本订单时回退，避免误伤已重新生成订单的申请。
 */
function revertSourceRequest(order: PurchaseOrderRecord): void {
  if (!order.requestId) return
  const request = purchaseRequestsMock.find((item) => item.id === order.requestId)
  if (!request || request.orderedOrderId !== order.id) return
  request.status = 'approved'
  request.orderedOrderId = undefined
  request.orderedOrderCode = undefined
  request.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
}

/** 采购订单接口：编号预取、分页、详情、新建、编辑、删除、发送与作废。 */
export const purchaseOrderHandlers = [
  http.get('*/api/purchase/order/next-code', async () => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    return ok(nextPurchaseOrderCode())
  }),

  // page / next-code 必须注册在 /:id 之前，否则会被当作 id 匹配。
  http.get('*/api/purchase/order/page', async ({ request }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const params = parseParams(new URL(request.url))
    return ok(paginate(filterOrders(params), params.current, params.pageSize))
  }),

  http.post('*/api/purchase/order', async ({ request }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const payload = (await request.json()) as Partial<SavePurchaseOrderPayload>

    // 供应商必须存在且启用（停用供应商不可被新订单引用）。
    const supplier = suppliersMock.find((item) => item.id === payload.supplierId)
    if (!supplier) return businessError(SUPPLIER_UNAVAILABLE, '请选择供应商')
    if (supplier.status === 0) return businessError(SUPPLIER_UNAVAILABLE, '该供应商已停用，不可被新订单引用')
    const itemsError = findItemsError(payload as SavePurchaseOrderPayload)
    if (itemsError) return itemsError

    // 来源申请（可选）：必须为已通过状态；生成后立即置为「已生成订单」并写投影，
    // 因此同一申请无法重复生成（再次生成会命中 4605）。
    let sourceRequest: (typeof purchaseRequestsMock)[number] | undefined
    if (payload.requestId) {
      sourceRequest = purchaseRequestsMock.find((item) => item.id === payload.requestId)
      if (!sourceRequest || sourceRequest.status !== 'approved') {
        return businessError(SOURCE_REQUEST_INVALID, '来源申请不存在或不是已通过状态，无法生成订单')
      }
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = `po-${dayjs(now).format('MMDDHHmmss')}`
    const items = buildItems(id, payload as SavePurchaseOrderPayload)
    const record: PurchaseOrderRecord = {
      id,
      code: nextPurchaseOrderCode(),
      requestId: sourceRequest?.id,
      requestCode: sourceRequest?.code,
      supplierId: supplier.id,
      supplierName: supplier.name,
      // 采购员 = 当前登录用户（生成 / 补录动作均由采购员本人发起）。
      purchaserId: session.user.id,
      purchaserName: session.user.name,
      totalAmount: calcOrderTotalAmount(items),
      expectedDate: payload.expectedDate,
      remark: payload.remark?.trim() || undefined,
      status: 'draft',
      items,
      createdAt: now,
      updatedAt: now,
    }
    purchaseOrdersMock.unshift(record)
    if (sourceRequest) {
      sourceRequest.status = 'ordered'
      sourceRequest.orderedOrderId = record.id
      sourceRequest.orderedOrderCode = record.code
      sourceRequest.updatedAt = now
    }
    logPurchase(
      session.user.name,
      sourceRequest ? '从申请生成采购订单' : '新建采购订单',
      `采购订单 ${record.code}${sourceRequest ? `（来源申请 ${sourceRequest.code}）` : ''}`,
    )
    return ok(record)
  }),

  http.put('*/api/purchase/order/:id', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = purchaseOrdersMock.find((item) => item.id === params.id)
    if (!record) return businessError(ORDER_NOT_FOUND, '采购订单不存在或已被移除')
    // 仅草稿可编辑：发出后单据内容对供应商生效，修改需作废后重新生成。
    if (record.status !== 'draft') {
      return businessError(STATUS_NOT_ALLOWED, '仅草稿状态的订单可以编辑')
    }
    const payload = (await request.json()) as Partial<SavePurchaseOrderPayload>
    const supplier = suppliersMock.find((item) => item.id === payload.supplierId)
    if (!supplier) return businessError(SUPPLIER_UNAVAILABLE, '请选择供应商')
    if (supplier.status === 0) return businessError(SUPPLIER_UNAVAILABLE, '该供应商已停用，不可被订单引用')
    const itemsError = findItemsError(payload as SavePurchaseOrderPayload)
    if (itemsError) return itemsError

    // 来源申请创建后不可更换（编辑载荷中的 requestId 一律忽略）。
    record.supplierId = supplier.id
    record.supplierName = supplier.name
    record.expectedDate = payload.expectedDate
    record.remark = payload.remark?.trim() || undefined
    // 明细整体替换：行 id 重排，商品快照刷新为商品表当前值。
    record.items = buildItems(record.id, payload as SavePurchaseOrderPayload)
    record.totalAmount = calcOrderTotalAmount(record.items)
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    logPurchase(session.user.name, '编辑采购订单', `采购订单 ${record.code}`)
    return ok(record)
  }),

  http.delete('*/api/purchase/order/:id', async ({ params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const index = purchaseOrdersMock.findIndex((item) => item.id === params.id)
    if (index === -1) return businessError(ORDER_NOT_FOUND, '采购订单不存在或已被移除')
    const record = purchaseOrdersMock[index]
    // 仅草稿可物理删除；其余状态留痕，用作废代替删除。
    if (record.status !== 'draft') {
      return businessError(STATUS_NOT_ALLOWED, '仅草稿状态的订单可以删除')
    }
    revertSourceRequest(record)
    purchaseOrdersMock.splice(index, 1)
    logPurchase(session.user.name, '删除采购订单', `采购订单 ${record.code}`)
    return ok(null)
  }),

  http.post('*/api/purchase/order/:id/send', async ({ params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = purchaseOrdersMock.find((item) => item.id === params.id)
    if (!record) return businessError(ORDER_NOT_FOUND, '采购订单不存在或已被移除')
    // 草稿首发；已拒绝的订单可原单重发（重新进入待供应商确认）。
    if (record.status !== 'draft' && record.status !== 'rejected') {
      return businessError(STATUS_NOT_ALLOWED, '当前状态不允许发送供应商')
    }
    const isResend = record.status === 'rejected'
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    record.status = 'pending_supplier'
    record.sentAt = now
    // 重发时清空上一轮的拒绝结论，时间线从发送节点重新推进。
    record.rejectedAt = undefined
    record.rejectReason = undefined
    record.updatedAt = now
    // 发送改变「在途」集合（draft 不计入），供应商列表的在途订单数随之刷新。
    syncSupplierPendingOrderCounts()
    logPurchase(session.user.name, isResend ? '重新发送采购订单' : '发送采购订单', `采购订单 ${record.code}`)
    return ok(record)
  }),

  http.post('*/api/purchase/order/:id/void', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = purchaseOrdersMock.find((item) => item.id === params.id)
    if (!record) return businessError(ORDER_NOT_FOUND, '采购订单不存在或已被移除')
    // 待供应商确认（误发召回）与已拒绝（放弃此单）可作废；草稿走删除。
    if (record.status !== 'pending_supplier' && record.status !== 'rejected') {
      return businessError(STATUS_NOT_ALLOWED, '当前状态不允许作废')
    }
    const body = (await request.json()) as Partial<{ reason: string }>
    const reason = body.reason?.trim()
    if (!reason) return businessError(4001, '请填写作废原因')

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    record.status = 'cancelled'
    record.cancelledAt = now
    record.cancelReason = reason
    record.updatedAt = now
    revertSourceRequest(record)
    // 作废可能移除一条在途订单（待确认作废），供应商在途订单数随之刷新。
    syncSupplierPendingOrderCounts()
    logPurchase(session.user.name, '作废采购订单', `采购订单 ${record.code}（${reason}）`)
    return ok(record)
  }),

  http.get('*/api/purchase/order/:id', async ({ params }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const record = purchaseOrdersMock.find((item) => item.id === params.id)
    if (!record) return businessError(ORDER_NOT_FOUND, '采购订单不存在或已被移除')
    return ok(record)
  }),
]
