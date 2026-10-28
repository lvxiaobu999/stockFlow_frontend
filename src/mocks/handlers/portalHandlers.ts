import dayjs from 'dayjs'
import { delay, http } from 'msw'
import type { AuthSession } from '@/features/auth/types'
import type { PurchaseOrderRecord, ShipOrderPayload, ShipmentRecord } from '@/features/supplier-portal/types'
import type { SupplierRecord } from '@/features/supplier/types'
import { getMockSession } from '@/mocks/data/auth'
import { appendLog } from '@/mocks/data/operation-logs'
import { purchaseOrdersMock, syncSupplierPendingOrderCounts } from '@/mocks/data/purchaseOrders'
import { nextShipmentCode, shipmentsMock } from '@/mocks/data/shipments'
import { suppliersMock } from '@/mocks/data/suppliers'
import { paginate } from '@/mocks/pagination'
import { businessError, httpError, ok } from '@/mocks/utils'

/**
 * 供应商门户接口：数据一律按当前会话的供应商档案过滤，订单动作只推进
 * 供应商侧的状态机（确认 / 拒绝 / 发货），不提供任何编辑订单内容的入口。
 *
 * 错误码分段（47xx）：4701 单据不存在或不属于当前供应商、4702 状态不允许、
 * 4703 发货明细不合法、4704 供应商档案缺失或已停用；通用段沿用 40xx（4001 参数缺失）。
 */
const DOC_NOT_FOUND = 4701
const STATUS_NOT_ALLOWED = 4702
const SHIP_ITEMS_INVALID = 4703
const SUPPLIER_PROFILE_INVALID = 4704

/** 门户接口的准入结果：会话与供应商档案成对返回。 */
interface SupplierContext {
  session: AuthSession
  supplier: SupplierRecord
}

/**
 * 门户接口统一准入：未登录 → 401；非供应商账号 → 403；
 * 供应商档案缺失 / 已停用 → 4704。供应商与用户表的关联口径为
 * portalUsername = 会话账号（真实实现为 user.supplier_id 外键直查）。
 */
function requireSupplier():
  { context: SupplierContext; error?: never } | { context?: never; error: ReturnType<typeof httpError> } {
  const session = getMockSession()
  if (!session) return { error: httpError(401, '登录已过期，请重新登录') }
  if (session.user.userType !== 'supplier') {
    return { error: httpError(403, '供应商门户接口仅限供应商账号访问') }
  }
  const supplier = suppliersMock.find((item) => item.portalUsername === session.user.username)
  if (!supplier) return { error: businessError(SUPPLIER_PROFILE_INVALID, '供应商档案不存在，请联系采购方开通门户') }
  if (supplier.status === 0) {
    return { error: businessError(SUPPLIER_PROFILE_INVALID, '供应商合作已暂停，暂无法访问门户') }
  }
  return { context: { session, supplier } }
}

/** 校验单据归属：订单必须存在且属于当前供应商（跨供应商访问与不存在同文案）。 */
function findOwnedOrder(orderId: string, supplierId: string): PurchaseOrderRecord | undefined {
  const order = purchaseOrdersMock.find((item) => item.id === orderId)
  return order && order.supplierId === supplierId ? order : undefined
}

/** 校验发货明细载荷，返回业务错误（null 表示通过）。 */
function findShipItemsError(order: PurchaseOrderRecord, payload: ShipOrderPayload) {
  if (!payload.items || payload.items.length === 0) {
    return businessError(SHIP_ITEMS_INVALID, '请填写各商品的发货数量')
  }
  // 明细必须与订单商品一一对应：多填 / 漏填 / 重复都会让收货对不上账。
  const orderQtyByProduct = new Map(order.items.map((item) => [item.productId, item.quantity]))
  const payloadQtyByProduct = new Map<string, number>()
  for (const item of payload.items) {
    if (!orderQtyByProduct.has(item.productId)) {
      return businessError(SHIP_ITEMS_INVALID, '发货明细包含订单以外的商品')
    }
    if (payloadQtyByProduct.has(item.productId)) {
      return businessError(SHIP_ITEMS_INVALID, '同一商品在发货明细中重复出现')
    }
    const orderedQty = orderQtyByProduct.get(item.productId)!
    if (!Number.isInteger(item.shippedQty) || item.shippedQty < 1 || item.shippedQty > orderedQty) {
      return businessError(SHIP_ITEMS_INVALID, `发货数量须在 1 ~ ${orderedQty} 之间（订单口径一次发清）`)
    }
    payloadQtyByProduct.set(item.productId, item.shippedQty)
  }
  if (payloadQtyByProduct.size !== orderQtyByProduct.size) {
    return businessError(SHIP_ITEMS_INVALID, '发货明细必须覆盖订单的全部商品')
  }
  return null
}

/** 门户审计日志便捷封装：动作归属采购域（订单状态由供应商操作驱动）。 */
function logPortal(operator: string, action: string, targetSummary: string): void {
  appendLog({ operator, module: 'purchase', action, targetSummary })
}

/** 供应商门户接口：首页统计、订单分页 / 详情、确认 / 拒绝 / 发货与发货单查询。 */
export const portalHandlers = [
  http.get('*/api/portal/summary', async () => {
    await delay(240)
    const admission = requireSupplier()
    if (admission.error) return admission.error
    const { supplier } = admission.context
    const orders = purchaseOrdersMock.filter((order) => order.supplierId === supplier.id)
    const monthPrefix = dayjs().format('YYYY-MM')
    return ok({
      totalOrders: orders.length,
      pendingConfirm: orders.filter((order) => order.status === 'pending_supplier').length,
      toShip: orders.filter((order) => order.status === 'confirmed').length,
      monthShipped: shipmentsMock.filter(
        (shipment) => shipment.supplierId === supplier.id && shipment.shippedAt.startsWith(monthPrefix),
      ).length,
    })
  }),

  http.get('*/api/portal/purchase-order/page', async ({ request }) => {
    await delay(280)
    const admission = requireSupplier()
    if (admission.error) return admission.error
    const { supplier } = admission.context
    const url = new URL(request.url)
    const current = Number(url.searchParams.get('current') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    const keyword = url.searchParams.get('keyword')?.trim()
    const status = url.searchParams.get('status') || undefined
    const createdFrom = url.searchParams.get('createdFrom') ?? undefined
    const createdTo = url.searchParams.get('createdTo') ?? undefined

    // 供应商只能看到自己名下的订单；keyword 匹配订单编号。
    const filtered = purchaseOrdersMock
      .filter((order) => order.supplierId === supplier.id)
      .filter((order) => (keyword ? order.code.includes(keyword) : true))
      .filter((order) => (status ? order.status === status : true))
      .filter((order) => {
        const createdDate = order.createdAt.slice(0, 10)
        if (createdFrom && createdDate < createdFrom) return false
        if (createdTo && createdDate > createdTo) return false
        return true
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return ok(paginate(filtered, current, pageSize))
  }),

  // page 必须注册在 /:id 之前，否则会被当作 id 匹配。
  http.get('*/api/portal/purchase-order/:id', async ({ params }) => {
    await delay(280)
    const admission = requireSupplier()
    if (admission.error) return admission.error
    const order = findOwnedOrder(String(params.id), admission.context.supplier.id)
    if (!order) return businessError(DOC_NOT_FOUND, '采购订单不存在或不属于当前供应商')
    return ok(order)
  }),

  http.post('*/api/portal/purchase-order/:id/confirm', async ({ request, params }) => {
    await delay(280)
    const admission = requireSupplier()
    if (admission.error) return admission.error
    const { session, supplier } = admission.context
    const order = findOwnedOrder(String(params.id), supplier.id)
    if (!order) return businessError(DOC_NOT_FOUND, '采购订单不存在或不属于当前供应商')
    // 仅待确认状态可确认；拒绝后的重发会重新回到待确认。
    if (order.status !== 'pending_supplier') {
      return businessError(STATUS_NOT_ALLOWED, '当前状态不允许确认订单')
    }
    const body = (await request.json()) as Partial<{ expectedShipDate: string }>
    const expectedShipDate = body.expectedShipDate?.trim() || undefined
    if (expectedShipDate && !/^\d{4}-\d{2}-\d{2}$/.test(expectedShipDate)) {
      return businessError(4001, '预计发货时间格式不正确')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    order.status = 'confirmed'
    order.confirmedAt = now
    // 预计发货时间回写订单，采购端可在订单详情查看（门户扩展字段）。
    order.promisedShipDate = expectedShipDate
    order.updatedAt = now
    syncSupplierPendingOrderCounts()
    logPortal(
      session.user.name,
      '供应商确认订单',
      `采购订单 ${order.code}${expectedShipDate ? `（预计 ${expectedShipDate} 发货）` : ''}`,
    )
    return ok(order)
  }),

  http.post('*/api/portal/purchase-order/:id/reject', async ({ request, params }) => {
    await delay(280)
    const admission = requireSupplier()
    if (admission.error) return admission.error
    const { session, supplier } = admission.context
    const order = findOwnedOrder(String(params.id), supplier.id)
    if (!order) return businessError(DOC_NOT_FOUND, '采购订单不存在或不属于当前供应商')
    if (order.status !== 'pending_supplier') {
      return businessError(STATUS_NOT_ALLOWED, '当前状态不允许拒绝订单')
    }
    const body = (await request.json()) as Partial<{ reason: string }>
    const reason = body.reason?.trim()
    if (!reason) return businessError(4001, '请填写拒绝原因')
    if (reason.length > 200) return businessError(4001, '拒绝原因不超过 200 个字符')

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    order.status = 'rejected'
    order.rejectedAt = now
    order.rejectReason = reason
    order.updatedAt = now
    syncSupplierPendingOrderCounts()
    logPortal(session.user.name, '供应商拒绝订单', `采购订单 ${order.code}（${reason}）`)
    return ok(order)
  }),

  http.post('*/api/portal/purchase-order/:id/ship', async ({ request, params }) => {
    await delay(280)
    const admission = requireSupplier()
    if (admission.error) return admission.error
    const { session, supplier } = admission.context
    const order = findOwnedOrder(String(params.id), supplier.id)
    if (!order) return businessError(DOC_NOT_FOUND, '采购订单不存在或不属于当前供应商')
    // 仅已确认可发货；发货后进入已发货，等待采购方收货。
    if (order.status !== 'confirmed') {
      return businessError(STATUS_NOT_ALLOWED, '当前状态不允许发货')
    }
    const payload = (await request.json()) as Partial<ShipOrderPayload>
    const itemsError = findShipItemsError(order, payload as ShipOrderPayload)
    if (itemsError) return itemsError

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const qtyByProduct = new Map(payload.items!.map((item) => [item.productId, item.shippedQty]))
    const shipment: ShipmentRecord = {
      id: `sh-${dayjs(now).format('MMDDHHmmss')}`,
      code: nextShipmentCode(),
      orderId: order.id,
      orderCode: order.code,
      supplierId: supplier.id,
      supplierName: supplier.name,
      // 物流公司 / 单号可选：支持供应商自行送货的场景。
      logisticsCompany: payload.logisticsCompany?.trim() || undefined,
      trackingNo: payload.trackingNo?.trim() || undefined,
      shippedAt: now,
      remark: payload.remark?.trim() || undefined,
      items: order.items.map((item, index) => ({
        id: `sh-${order.id}-item-${index + 1}`,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        spec: item.spec,
        unit: item.unit,
        orderedQty: item.quantity,
        shippedQty: qtyByProduct.get(item.productId)!,
        remark: item.remark,
      })),
      createdByName: session.user.name,
      createdAt: now,
    }
    shipmentsMock.unshift(shipment)
    order.status = 'shipped'
    order.shippedAt = now
    order.updatedAt = now
    // 发货移除一条在途订单，供应商列表的在途订单数随之刷新。
    syncSupplierPendingOrderCounts()
    logPortal(session.user.name, '供应商发货', `采购订单 ${order.code}（发货单 ${shipment.code}）`)
    return ok({ order, shipment })
  }),

  http.get('*/api/portal/shipment/page', async ({ request }) => {
    await delay(280)
    const admission = requireSupplier()
    if (admission.error) return admission.error
    const { supplier } = admission.context
    const url = new URL(request.url)
    const current = Number(url.searchParams.get('current') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    const keyword = url.searchParams.get('keyword')?.trim()

    // keyword 同时匹配发货单号与关联订单号；列表按发货时间倒序。
    const filtered = shipmentsMock
      .filter((shipment) => shipment.supplierId === supplier.id)
      .filter((shipment) => (keyword ? `${shipment.code}${shipment.orderCode}`.includes(keyword) : true))
      .sort((a, b) => b.shippedAt.localeCompare(a.shippedAt))
    return ok(paginate(filtered, current, pageSize))
  }),
]
