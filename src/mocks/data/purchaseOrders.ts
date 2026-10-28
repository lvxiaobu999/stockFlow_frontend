import dayjs from 'dayjs'
import type {
  PurchaseOrderItem,
  PurchaseOrderRecord,
  PurchaseOrderStatus,
  PurchaseRequestItem,
} from '@/features/purchase/types'
import { calcItemAmount } from '@/features/purchase/utils/purchaseRequest'
import { calcOrderTotalAmount } from '@/features/purchase/utils/purchaseOrder'
import { productsMock } from './products'
import { purchaseRequestsMock } from './purchaseRequests'
import { suppliersMock } from './suppliers'
import { findUserByUsername } from './users'

/**
 * 采购订单 Mock 数据：10 条订单覆盖全部状态（草稿 1 / 待供应商确认 1 / 已确认 2 /
 * 已发货 1 / 已收货 1 / 已验收 1 / 已完成 1 / 已拒绝 1 / 已作废 1）。
 *
 * - 编号 PO + 创建日期 + 4 位流水，全局流水随创建日期递增；
 * - 「已生成订单」申请（pr-001 / pr-002）的订单由申请种子**派生**：
 *   订单编码 / 明细 / 金额全部取自申请记录（成交单价 = 申请参考价），
 *   创建时间 = 申请审批通过后 2 小时（申请创建 +26h），保证两侧数据集自洽；
 * - 其余 8 条为线下补录订单（requestId 为空，数据库设计允许 request_id NULL），
 *   明细引用 productsMock 真实商品，成交价默认取采购参考价（已完成单含一笔议价）；
 * - 生命周期时间由「创建时间 + 小时偏移」确定性生成；
 * - 供应商在途订单数（pendingOrderCount）由本数据集回写，口径见文件末尾。
 */

/** 订单生命周期节点时间戳字段名（与 PurchaseOrderRecord 上的可选时间戳一一对应）。 */
type OrderLifecycleField =
  'sentAt' | 'confirmedAt' | 'shippedAt' | 'receivedAt' | 'inspectedAt' | 'completedAt' | 'rejectedAt' | 'cancelledAt'

/** 线下补录订单种子：prodIndex 对应 productsMock 下标，unitPrice 为成交单价。 */
interface StandaloneOrderSeed {
  /** 采购员登录名（mock 用户表查找）。 */
  purchaser: string
  supplierId: string
  status: PurchaseOrderStatus
  expectedDate?: string
  remark?: string
  items: Array<{ prodIndex: number; quantity: number; unitPrice: number; remark?: string }>
  /** 生命周期节点相对创建时间的小时偏移（拒绝 / 作废需带原因）。 */
  steps: Partial<Record<OrderLifecycleField, number>>
  rejectReason?: string
  cancelReason?: string
}

/** 线下补录订单种子（按创建时间升序，流水号随下标递增）。 */
const standaloneOrderSeeds: Array<{ created: string; seed: StandaloneOrderSeed }> = [
  {
    created: '2026-09-10 10:00:00',
    seed: {
      purchaser: 'zhangwei',
      supplierId: 'sup-001',
      status: 'completed',
      expectedDate: '2026-09-20',
      remark: '季度框架协议价（A4 复印纸议价 125/箱）',
      items: [
        { prodIndex: 0, quantity: 40, unitPrice: 125 },
        { prodIndex: 2, quantity: 20, unitPrice: 138 },
      ],
      steps: { sentAt: 4, confirmedAt: 26, shippedAt: 54, receivedAt: 78, inspectedAt: 102, completedAt: 240 },
    },
  },
  {
    created: '2026-09-12 09:00:00',
    seed: {
      purchaser: 'linmin',
      supplierId: 'sup-002',
      status: 'rejected',
      expectedDate: '2026-09-25',
      items: [{ prodIndex: 20, quantity: 15, unitPrice: 129 }],
      steps: { sentAt: 2, rejectedAt: 25 },
      rejectReason: '罗技 MK295 缺货，交期无法满足，建议更换型号或取消',
    },
  },
  {
    created: '2026-09-15 14:00:00',
    seed: {
      purchaser: 'zhangwei',
      supplierId: 'sup-010',
      status: 'pending_supplier',
      expectedDate: '2026-09-30',
      items: [
        { prodIndex: 6, quantity: 100, unitPrice: 18.9 },
        { prodIndex: 8, quantity: 60, unitPrice: 9.6 },
      ],
      steps: { sentAt: 2 },
    },
  },
  {
    created: '2026-09-18 10:00:00',
    seed: {
      purchaser: 'zhaolei',
      supplierId: 'sup-003',
      status: 'inspected',
      expectedDate: '2026-09-28',
      items: [
        { prodIndex: 23, quantity: 40, unitPrice: 32.5 },
        { prodIndex: 22, quantity: 20, unitPrice: 96 },
      ],
      steps: { sentAt: 5, confirmedAt: 28, shippedAt: 94, receivedAt: 118, inspectedAt: 142 },
    },
  },
  {
    created: '2026-09-22 09:00:00',
    seed: {
      purchaser: 'linmin',
      supplierId: 'sup-004',
      status: 'shipped',
      expectedDate: '2026-10-10',
      remark: '文件柜需供应商送货上楼',
      items: [
        { prodIndex: 29, quantity: 2, unitPrice: 329 },
        { prodIndex: 28, quantity: 10, unitPrice: 69 },
      ],
      steps: { sentAt: 2, confirmedAt: 26, shippedAt: 102 },
    },
  },
  {
    created: '2026-09-26 10:00:00',
    seed: {
      purchaser: 'zhangwei',
      supplierId: 'sup-006',
      status: 'cancelled',
      expectedDate: '2026-10-15',
      items: [{ prodIndex: 18, quantity: 5, unitPrice: 199 }],
      steps: { sentAt: 4, cancelledAt: 23 },
      cancelReason: '预算调整，本季度扩展坞采购延后',
    },
  },
  {
    created: '2026-10-09 11:00:00',
    seed: {
      purchaser: 'zhaolei',
      supplierId: 'sup-005',
      status: 'draft',
      expectedDate: '2026-10-25',
      remark: '保洁用品月度补货，待确认数量后发送',
      items: [
        { prodIndex: 24, quantity: 30, unitPrice: 18.8 },
        { prodIndex: 25, quantity: 50, unitPrice: 8.9 },
      ],
      steps: {},
    },
  },
  {
    created: '2026-10-12 10:00:00',
    seed: {
      purchaser: 'linmin',
      supplierId: 'sup-002',
      status: 'confirmed',
      expectedDate: '2026-10-28',
      items: [{ prodIndex: 21, quantity: 20, unitPrice: 89 }],
      steps: { sentAt: 5, confirmedAt: 47 },
    },
  },
]

/** 按小时偏移展开生命周期时间戳（创建时间 + 偏移）。 */
function buildLifecycle(createdAt: string, steps: Partial<Record<OrderLifecycleField, number>>) {
  const result: Partial<Record<OrderLifecycleField, string>> = {}
  for (const [field, offsetHours] of Object.entries(steps)) {
    result[field as OrderLifecycleField] = dayjs(createdAt)
      .add(offsetHours ?? 0, 'hour')
      .format('YYYY-MM-DD HH:mm:ss')
  }
  return result
}

/** 由申请明细派生订单明细：快照字段照抄，成交单价 = 申请参考价。 */
function itemsFromRequest(requestId: string, items: PurchaseRequestItem[]): PurchaseOrderItem[] {
  return items.map((item, index) => ({
    id: `${requestId}-item-${index + 1}`,
    productId: item.productId,
    productCode: item.productCode,
    productName: item.productName,
    spec: item.spec,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.referencePrice,
    amount: calcItemAmount(item.quantity, item.referencePrice),
    remark: item.remark,
  }))
}

/**
 * 「已生成订单」申请的派生订单：目标状态与供应商按申请顺序指定
 * （pr-001 打印耗材 → 康乐办公用品，已收货；pr-002 笔记本 → 原创智造，已确认）。
 */
const LINKED_ORDER_TARGETS: Array<{ requestId: string; supplierId: string; status: PurchaseOrderStatus }> = [
  { requestId: 'pr-001', supplierId: 'sup-010', status: 'received' },
  { requestId: 'pr-002', supplierId: 'sup-011', status: 'confirmed' },
]

/** 从申请派生的订单创建时间：审批通过（申请创建 +24h）后 2 小时。 */
const LINKED_CREATED_OFFSET_HOURS = 26
/** 派生订单的生命周期偏移（相对订单创建时间）。 */
const LINKED_LIFECYCLE_STEPS: Record<'received' | 'confirmed', Partial<Record<OrderLifecycleField, number>>> = {
  received: { sentAt: 2, confirmedAt: 22, shippedAt: 47, receivedAt: 75 },
  confirmed: { sentAt: 2, confirmedAt: 22 },
}

/**
 * 全量采购订单：派生订单（关联申请）在前，线下补录订单在后；
 * 列表默认按创建时间倒序，与申请列表「最新在前」口径一致。
 */
export const purchaseOrdersMock: PurchaseOrderRecord[] = (() => {
  const linked: PurchaseOrderRecord[] = LINKED_ORDER_TARGETS.flatMap((target, index) => {
    const request = purchaseRequestsMock.find((item) => item.id === target.requestId)
    // 数据集不变量：被引用的申请必须存在且已进入「已生成订单」状态。
    if (!request || request.status !== 'ordered') {
      throw new Error(`派生订单引用了不存在或未生成订单的申请：${target.requestId}`)
    }
    const supplier = suppliersMock.find((item) => item.id === target.supplierId)
    if (!supplier) throw new Error(`派生订单引用了不存在的供应商：${target.supplierId}`)

    const createdAt = dayjs(request.createdAt).add(LINKED_CREATED_OFFSET_HOURS, 'hour').format('YYYY-MM-DD HH:mm:ss')
    const lifecycle = buildLifecycle(createdAt, LINKED_LIFECYCLE_STEPS[target.status as 'received' | 'confirmed'])
    const items = itemsFromRequest(request.id, request.items)
    return [
      {
        id: `po-${String(index + 1).padStart(3, '0')}`,
        code: request.orderedOrderCode ?? '',
        requestId: request.id,
        requestCode: request.code,
        supplierId: supplier.id,
        supplierName: supplier.name,
        // 派生订单的采购员 = 申请提交人（MVP 一单一申请，生成动作由申请人发起）。
        purchaserId: request.applicantId,
        purchaserName: request.applicantName,
        totalAmount: calcOrderTotalAmount(items),
        expectedDate: request.expectedDate,
        status: target.status,
        items,
        ...lifecycle,
        createdAt,
        updatedAt: Object.values(lifecycle).sort().at(-1) ?? createdAt,
      },
    ]
  })

  const standalone: PurchaseOrderRecord[] = standaloneOrderSeeds.map(({ created, seed }, index) => {
    const supplier = suppliersMock.find((item) => item.id === seed.supplierId)
    if (!supplier) throw new Error(`补录订单种子引用了不存在的供应商：${seed.supplierId}`)
    const purchaser = findUserByUsername(seed.purchaser)
    if (!purchaser) throw new Error(`补录订单种子引用了不存在的采购员：${seed.purchaser}`)

    // 流水号接续派生订单（派生 2 条 → 从 3 起），全局随创建时间递增。
    const seq = linked.length + index + 1
    const code = `PO${dayjs(created).format('YYYYMMDD')}${String(seq).padStart(4, '0')}`
    const items: PurchaseOrderItem[] = seed.items.map((itemSeed, itemIndex) => {
      const product = productsMock[itemSeed.prodIndex]
      if (!product) throw new Error(`补录订单种子引用了不存在的商品下标：${itemSeed.prodIndex}`)
      return {
        id: `${code}-item-${itemIndex + 1}`,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        spec: product.spec,
        unit: product.unit,
        quantity: itemSeed.quantity,
        unitPrice: itemSeed.unitPrice,
        amount: calcItemAmount(itemSeed.quantity, itemSeed.unitPrice),
        remark: itemSeed.remark,
      }
    })
    const lifecycle = buildLifecycle(created, seed.steps)
    return {
      id: `po-${String(seq).padStart(3, '0')}`,
      code,
      supplierId: supplier.id,
      supplierName: supplier.name,
      purchaserId: purchaser.id,
      purchaserName: purchaser.name,
      totalAmount: calcOrderTotalAmount(items),
      expectedDate: seed.expectedDate,
      remark: seed.remark,
      status: seed.status,
      items,
      ...lifecycle,
      rejectReason: seed.rejectReason,
      cancelReason: seed.cancelReason,
      createdAt: created,
      updatedAt: Object.values(lifecycle).sort().at(-1) ?? created,
    }
  })

  return [...linked, ...standalone].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})()

/**
 * 生成下一个订单编号：全局最大流水 + 1，日期段为当天（服务端生成口径）。
 * 编号预取接口（新建表单展示）与保存兜底共用。
 */
export function nextPurchaseOrderCode(): string {
  const maxSeq = purchaseOrdersMock.reduce((max, item) => Math.max(max, Number(item.code.slice(-4))), 0)
  return `PO${dayjs().format('YYYYMMDD')}${String(maxSeq + 1).padStart(4, '0')}`
}

/**
 * 回写供应商「在途订单数」：已发送且未收货（待确认 / 已确认 / 已发货）的订单数。
 * 采购订单落地前该字段为静态投影，现由订单数据集推导，保证供应商列表口径真实。
 */
export function syncSupplierPendingOrderCounts(): void {
  const pendingCounts = new Map<string, number>()
  for (const order of purchaseOrdersMock) {
    if (['pending_supplier', 'confirmed', 'shipped'].includes(order.status)) {
      pendingCounts.set(order.supplierId, (pendingCounts.get(order.supplierId) ?? 0) + 1)
    }
  }
  for (const supplier of suppliersMock) {
    supplier.pendingOrderCount = pendingCounts.get(supplier.id) ?? 0
  }
}
syncSupplierPendingOrderCounts()
