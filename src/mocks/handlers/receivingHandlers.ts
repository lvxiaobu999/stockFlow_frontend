import dayjs from 'dayjs'
import { delay, http } from 'msw'
import type {
  ConfirmReceiptPayload,
  InspectionRecord,
  ReceiptRecord,
  SubmitInspectionPayload,
} from '@/features/receiving/types'
import { INSPECTION_RESULT_META } from '@/features/receiving/types'
import { getMockSession } from '@/mocks/data/auth'
import { inspectionsMock, nextInspectionCode, receiptsMock } from '@/mocks/data/receiving'
import { appendLog } from '@/mocks/data/operation-logs'
import { purchaseOrdersMock, syncSupplierPendingOrderCounts } from '@/mocks/data/purchaseOrders'
import { paginate } from '@/mocks/pagination'
import { businessError, httpError, ok } from '@/mocks/utils'

/**
 * 收货与验收接口：仓库「确认收货 / 提交验收」两个业务动作驱动收货单与验收单
 * 的状态机，并联动推进采购订单（shipped → received → inspected）。
 *
 * 单据为预建口径：发货即有待收货单、收货即有待验收单，列表天然承载
 * 「待收货 / 待验收」工作台；单据提交后不可修改（冲正 / 退货归第二阶段）。
 * 合格数量入库待库存模块（路线图第 9 步）落地后写入 inventory_transaction，
 * 本模块仅记录验收结论（演示契约，偏差记录见 docs/接口与 Mock 说明.md）。
 *
 * 错误码分段（48xx）：4801 单据不存在、4802 状态不允许该操作、
 * 4803 收货明细不合法、4804 验收明细不合法；通用段沿用 40xx（4001 参数缺失）。
 */
const DOC_NOT_FOUND = 4801
const STATUS_NOT_ALLOWED = 4802
const RECEIPT_ITEMS_INVALID = 4803
const INSPECTION_ITEMS_INVALID = 4804

/** 收货与验收接口的登录校验：内部管理端动作，未登录一律 401。 */
function requireSession() {
  const session = getMockSession()
  if (!session) return { session: undefined, error: httpError(401, '登录已过期，请重新登录') }
  return { session, error: undefined }
}

/** 校验收货明细载荷，返回业务错误（null 表示通过）。 */
function findReceiptItemsError(receipt: ReceiptRecord, payload: ConfirmReceiptPayload) {
  if (!payload.items || payload.items.length === 0) {
    return businessError(RECEIPT_ITEMS_INVALID, '请填写各商品的实收数量')
  }
  // 明细必须与收货单商品一一对应：多填 / 漏填 / 重复都会让验收对不上账。
  const expectedByProduct = new Map(receipt.items.map((item) => [item.productId, item.expectedQty]))
  const payloadQtyByProduct = new Map<string, number>()
  for (const item of payload.items) {
    if (!expectedByProduct.has(item.productId)) {
      return businessError(RECEIPT_ITEMS_INVALID, '收货明细包含收货单以外的商品')
    }
    if (payloadQtyByProduct.has(item.productId)) {
      return businessError(RECEIPT_ITEMS_INVALID, '同一商品在收货明细中重复出现')
    }
    const expectedQty = expectedByProduct.get(item.productId)!
    // MVP 一次收清：允许少收（少件如实登记），不允许超收。
    if (!Number.isInteger(item.receivedQty) || item.receivedQty < 1 || item.receivedQty > expectedQty) {
      return businessError(RECEIPT_ITEMS_INVALID, `实收数量须在 1 ~ ${expectedQty} 之间（应发口径，不允许超收）`)
    }
    payloadQtyByProduct.set(item.productId, item.receivedQty)
  }
  if (payloadQtyByProduct.size !== expectedByProduct.size) {
    return businessError(RECEIPT_ITEMS_INVALID, '收货明细必须覆盖收货单的全部商品')
  }
  return null
}

/** 校验验分明细载荷，返回业务错误（null 表示通过）。 */
function findInspectionItemsError(inspection: InspectionRecord, payload: SubmitInspectionPayload) {
  if (!payload.items || payload.items.length === 0) {
    return businessError(INSPECTION_ITEMS_INVALID, '请填写各商品的合格 / 不合格数量')
  }
  const receivedByProduct = new Map(inspection.items.map((item) => [item.productId, item.receivedQty]))
  const payloadQtyByProduct = new Map<string, number>()
  for (const item of payload.items) {
    if (!receivedByProduct.has(item.productId)) {
      return businessError(INSPECTION_ITEMS_INVALID, '验收明细包含验收单以外的商品')
    }
    if (payloadQtyByProduct.has(item.productId)) {
      return businessError(INSPECTION_ITEMS_INVALID, '同一商品在验收明细中重复出现')
    }
    const receivedQty = receivedByProduct.get(item.productId)!
    const { qualifiedQty, unqualifiedQty } = item
    if (
      !Number.isInteger(qualifiedQty) ||
      !Number.isInteger(unqualifiedQty) ||
      qualifiedQty < 0 ||
      unqualifiedQty < 0
    ) {
      return businessError(INSPECTION_ITEMS_INVALID, '合格 / 不合格数量须为不小于 0 的整数')
    }
    // 数据库业务约束：合格 + 不合格 = 实收，不允许凭空多出数量。
    if (qualifiedQty + unqualifiedQty !== receivedQty) {
      return businessError(INSPECTION_ITEMS_INVALID, `合格 + 不合格数量须等于实收数量 ${receivedQty}`)
    }
    payloadQtyByProduct.set(item.productId, qualifiedQty)
  }
  if (payloadQtyByProduct.size !== receivedByProduct.size) {
    return businessError(INSPECTION_ITEMS_INVALID, '验收明细必须覆盖验收单的全部商品')
  }
  return null
}

/** 验收结论汇总判定（与数据集派生同口径）：全合格 / 全不合格 / 部分合格。 */
function resolveResult(inspection: InspectionRecord) {
  const qualifiedTotal = inspection.items.reduce((sum, item) => sum + item.qualifiedQty, 0)
  const receivedTotal = inspection.items.reduce((sum, item) => sum + item.receivedQty, 0)
  if (qualifiedTotal === 0) return 'unqualified' as const
  return qualifiedTotal === receivedTotal ? ('qualified' as const) : ('partial' as const)
}

/** 收货与验收审计日志便捷封装：动作归属收货与验收模块。 */
function logReceiving(operator: string, action: string, targetSummary: string): void {
  appendLog({ operator, module: 'receiving', action, targetSummary })
}

/** 收货单与验收单接口：分页 / 详情 / 确认收货 / 提交验收 / 订单关联单据联查。 */
export const receivingHandlers = [
  http.get('*/api/receiving/receipt/page', async ({ request }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const url = new URL(request.url)
    const current = Number(url.searchParams.get('current') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    const keyword = url.searchParams.get('keyword')?.trim()
    const status = url.searchParams.get('status') || undefined
    const supplierId = url.searchParams.get('supplierId') || undefined
    const orderId = url.searchParams.get('orderId') || undefined
    const createdFrom = url.searchParams.get('createdFrom') ?? undefined
    const createdTo = url.searchParams.get('createdTo') ?? undefined

    // keyword 同时匹配收货单号与关联订单号；列表按单据创建时间倒序。
    const filtered = receiptsMock
      .filter((receipt) => (keyword ? `${receipt.code}${receipt.orderCode}`.includes(keyword) : true))
      .filter((receipt) => (status ? receipt.status === status : true))
      .filter((receipt) => (supplierId ? receipt.supplierId === supplierId : true))
      .filter((receipt) => (orderId ? receipt.orderId === orderId : true))
      .filter((receipt) => {
        const createdDate = receipt.createdAt.slice(0, 10)
        if (createdFrom && createdDate < createdFrom) return false
        if (createdTo && createdDate > createdTo) return false
        return true
      })
    return ok(paginate(filtered, current, pageSize))
  }),

  // page 必须注册在 /:id 之前，否则会被当作 id 匹配。
  http.get('*/api/receiving/receipt/:id', async ({ params }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const receipt = receiptsMock.find((item) => item.id === String(params.id))
    if (!receipt) return businessError(DOC_NOT_FOUND, '收货单不存在')
    return ok(receipt)
  }),

  http.post('*/api/receiving/receipt/:id/confirm', async ({ request, params }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const receipt = receiptsMock.find((item) => item.id === String(params.id))
    if (!receipt) return businessError(DOC_NOT_FOUND, '收货单不存在')
    // 仅待收货可确认；已收货单不可重复登记（提交后不可修改）。
    if (receipt.status !== 'pending') {
      return businessError(STATUS_NOT_ALLOWED, '当前收货单已确认收货，不可重复操作')
    }
    const order = purchaseOrdersMock.find((item) => item.id === receipt.orderId)
    if (!order) return businessError(DOC_NOT_FOUND, '关联采购订单不存在')

    const payload = (await request.json()) as Partial<ConfirmReceiptPayload>
    const itemsError = findReceiptItemsError(receipt, payload as ConfirmReceiptPayload)
    if (itemsError) return itemsError
    const remark = payload.remark?.trim() || undefined

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const qtyByProduct = new Map(payload.items!.map((item) => [item.productId, item.receivedQty]))
    for (const item of receipt.items) {
      item.receivedQty = qtyByProduct.get(item.productId)!
    }
    receipt.status = 'received'
    receipt.remark = remark
    receipt.receivedByName = admission.session.user.name
    receipt.receivedAt = now
    receipt.updatedAt = now

    // 确认收货即预建「待验收」验收单（数据库设计 inspection.result 默认 pending），
    // 订单数量作为投影随明细落单，供验收操作页「应收 vs 实收」对照。
    const inspection: InspectionRecord = {
      id: `is-${dayjs(now).format('MMDDHHmmss')}`,
      code: nextInspectionCode(),
      orderId: receipt.orderId,
      orderCode: receipt.orderCode,
      receiptId: receipt.id,
      receiptCode: receipt.code,
      supplierId: receipt.supplierId,
      supplierName: receipt.supplierName,
      result: 'pending',
      items: receipt.items.map((item, index) => ({
        id: `${receipt.id}-inspection-item-${index + 1}`,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        spec: item.spec,
        unit: item.unit,
        orderedQty:
          order.items.find((orderItem) => orderItem.productId === item.productId)?.quantity ?? item.expectedQty,
        receivedQty: item.receivedQty,
        qualifiedQty: 0,
        unqualifiedQty: 0,
        remark: item.remark,
      })),
      createdAt: now,
      updatedAt: now,
    }
    inspectionsMock.unshift(inspection)
    receipt.inspectionId = inspection.id
    receipt.inspectionCode = inspection.code
    receipt.inspectionResult = inspection.result

    // 订单联动进入已收货；收货消化一条在途订单，供应商列表在途数随之刷新。
    order.status = 'received'
    order.receivedAt = now
    order.updatedAt = now
    syncSupplierPendingOrderCounts()
    logReceiving(admission.session.user.name, '确认收货', `收货单 ${receipt.code}（订单 ${receipt.orderCode}）`)
    return ok(receipt)
  }),

  http.get('*/api/receiving/inspection/page', async ({ request }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const url = new URL(request.url)
    const current = Number(url.searchParams.get('current') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    const keyword = url.searchParams.get('keyword')?.trim()
    const result = url.searchParams.get('result') || undefined
    const supplierId = url.searchParams.get('supplierId') || undefined
    const orderId = url.searchParams.get('orderId') || undefined
    const createdFrom = url.searchParams.get('createdFrom') ?? undefined
    const createdTo = url.searchParams.get('createdTo') ?? undefined

    // result=settled 为三种已验收结论的合并口径（列表页签「已验收」）。
    const filtered = inspectionsMock
      .filter((inspection) =>
        keyword ? `${inspection.code}${inspection.receiptCode}${inspection.orderCode}`.includes(keyword) : true,
      )
      .filter((inspection) =>
        result ? (result === 'settled' ? inspection.result !== 'pending' : inspection.result === result) : true,
      )
      .filter((inspection) => (supplierId ? inspection.supplierId === supplierId : true))
      .filter((inspection) => (orderId ? inspection.orderId === orderId : true))
      .filter((inspection) => {
        const createdDate = inspection.createdAt.slice(0, 10)
        if (createdFrom && createdDate < createdFrom) return false
        if (createdTo && createdDate > createdTo) return false
        return true
      })
    return ok(paginate(filtered, current, pageSize))
  }),

  http.get('*/api/receiving/inspection/:id', async ({ params }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const inspection = inspectionsMock.find((item) => item.id === String(params.id))
    if (!inspection) return businessError(DOC_NOT_FOUND, '验收单不存在')
    return ok(inspection)
  }),

  http.post('*/api/receiving/inspection/:id/submit', async ({ request, params }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const inspection = inspectionsMock.find((item) => item.id === String(params.id))
    if (!inspection) return businessError(DOC_NOT_FOUND, '验收单不存在')
    // 仅待验收可提交；结论落定后单据不可修改（冲正 / 退货归第二阶段）。
    if (inspection.result !== 'pending') {
      return businessError(STATUS_NOT_ALLOWED, '当前验收单已提交结论，不可重复操作')
    }
    const order = purchaseOrdersMock.find((item) => item.id === inspection.orderId)
    if (!order) return businessError(DOC_NOT_FOUND, '关联采购订单不存在')

    const payload = (await request.json()) as Partial<SubmitInspectionPayload>
    const itemsError = findInspectionItemsError(inspection, payload as SubmitInspectionPayload)
    if (itemsError) return itemsError

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const qtyByProduct = new Map(payload.items!.map((item) => [item.productId, item]))
    for (const item of inspection.items) {
      const matched = qtyByProduct.get(item.productId)!
      item.qualifiedQty = matched.qualifiedQty
      item.unqualifiedQty = matched.unqualifiedQty
    }
    inspection.result = resolveResult(inspection)
    inspection.remark = payload.remark?.trim() || undefined
    inspection.inspectedByName = admission.session.user.name
    inspection.inspectedAt = now
    inspection.updatedAt = now

    // 结论回写收货单投影（列表「去验收」按钮据此收敛为「查看」）。
    const receipt = receiptsMock.find((item) => item.id === inspection.receiptId)
    if (receipt) {
      receipt.inspectionResult = inspection.result
      receipt.updatedAt = now
    }

    // 订单联动进入已验收（后续付款结清属付款模块）；合格数量入库待库存模块落地后
    // 写入 inventory_transaction（路线图第 9 步），此处仅记录验收结论。
    order.status = 'inspected'
    order.inspectedAt = now
    order.updatedAt = now
    logReceiving(
      admission.session.user.name,
      '确认验收',
      `验收单 ${inspection.code}（${INSPECTION_RESULT_META[inspection.result].label}）`,
    )
    return ok(inspection)
  }),

  // 采购订单详情「关联单据」联查：按订单找收货单（最新一张）与对应验收单；
  // 尚未发货 / 未收货的订单合法地返回 null，前端按状态渲染占位文案。
  http.get('*/api/receiving/order/:orderId/documents', async ({ params }) => {
    await delay(240)
    const admission = requireSession()
    if (admission.error) return admission.error
    const orderId = String(params.orderId)
    const order = purchaseOrdersMock.find((item) => item.id === orderId)
    if (!order) return businessError(DOC_NOT_FOUND, '采购订单不存在')
    const receipt = receiptsMock.find((item) => item.orderId === orderId) ?? null
    const inspection = receipt ? (inspectionsMock.find((item) => item.receiptId === receipt.id) ?? null) : null
    return ok({ receipt, inspection })
  }),
]
