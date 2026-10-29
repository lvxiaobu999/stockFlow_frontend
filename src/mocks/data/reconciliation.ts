import dayjs from 'dayjs'
import type {
  CreateReconciliationPayload,
  ReconciliationDiffType,
  ReconciliationItem,
  ReconciliationPoolRecord,
  ReconciliationRecord,
  ReconciliationStatus,
  ReconciliationSummary,
} from '@/features/reconciliation/types'
import { purchaseOrdersMock } from './purchaseOrders'
import { receiptsMock } from './receiving'
import { suppliersMock } from './suppliers'
import { findUserByUsername } from './users'

/**
 * 对账 Mock 数据：对账单按「供应商 + 对账期间」汇总已收货单据，明细 = 收货单 × 商品。
 *
 * - 应付金额口径 = 实收数量 × 订单成交价（单价取订单明细快照，与订单金额同源）；
 * - 已付金额为演示种子（orderPaidAmounts，付款管理模块落地后改为 payment 记录推导）；
 * - 差异金额为人工标记口径（MVP 一次发清无自动短收差异），由「标记差异」动作写入；
 * - 种子 5 条对账单覆盖全部状态：已关闭 / 已确认（本月）/ 待确认 / 有差异 / 草稿；
 * - 待对账单据池 = 已收货且未被任何对账单纳入的收货单，整单对账（部分行对账为二期）；
 * - 编号 RE + 单据日期 + 4 位流水（原型 RC 前缀与收货单冲突，偏差已记录在 docs）。
 */

/** 订单维度已付金额种子（演示口径；金额必须 ≤ 应付金额）。 */
export const orderPaidAmountsMock: Record<string, number> = {
  // po-001（康乐办公用品，留在单据池）：预付部分货款。
  'po-001': 800,
  // po-003（杭州宏远纸业，已关闭对账单）：货款两清。
  'po-003': 6104,
  // po-014（上海本墨，已确认对账单）：预付 1500，待付 1670。
  'po-014': 1500,
}

/** 对账单核心字段（数据库 reconciliation 表口径，展示快照由接口联表回填）。 */
export interface ReconciliationRow {
  id: string
  code: string
  supplierId: string
  supplierName: string
  periodStart: string
  periodEnd: string
  status: ReconciliationStatus
  /** 明细行 = 收货单 × 商品（引用 receiptIds，行数据由单据推导）。 */
  receiptIds: string[]
  diffType?: ReconciliationDiffType
  diffAmount?: number
  diffReason?: string
  createdByName: string
  remark?: string
  confirmedByName?: string
  confirmedAt?: string
  closedByName?: string
  closedAt?: string
  closedRemark?: string
  createdAt: string
  updatedAt: string
}

/** 对账单核心行（reconciliationMock 存储层）。 */
export const reconsMock: ReconciliationRow[] = []

/** 演示财务（财务部唯一在职账号）与协助发起对账的采购员。 */
const FINANCE_OPERATOR = 'lupei'
const PURCHASER_OPERATOR = 'zhangwei'

/**
 * 由收货单构建对账明细：单价 / 采购数量取订单明细快照，实收取收货单，
 * 已付按订单已付金额顺序分摊到明细行（演示口径，付款模块落地后替换）。
 */
export function buildReconciliationItems(reconId: string, receipts: typeof receiptsMock): ReconciliationItem[] {
  const items: ReconciliationItem[] = []
  for (const receipt of receipts) {
    const order = purchaseOrdersMock.find((candidate) => candidate.id === receipt.orderId)
    if (!order) throw new Error(`对账明细引用了不存在的订单：${receipt.orderId}`)
    let paidLeft = orderPaidAmountsMock[order.id] ?? 0
    for (const receiptItem of receipt.items) {
      const orderItem = order.items.find((candidate) => candidate.productId === receiptItem.productId)
      if (!orderItem) throw new Error(`收货单 ${receipt.code} 的商品不在订单 ${order.code} 明细中`)
      const amount = Math.round(receiptItem.receivedQty * orderItem.unitPrice * 100) / 100
      const paidAmount = Math.min(paidLeft, amount)
      paidLeft = Math.round((paidLeft - paidAmount) * 100) / 100
      items.push({
        id: `${reconId}-item-${items.length + 1}`,
        orderId: order.id,
        orderCode: order.code,
        receiptId: receipt.id,
        receiptCode: receipt.code,
        productId: receiptItem.productId,
        productCode: receiptItem.productCode,
        productName: receiptItem.productName,
        spec: receiptItem.spec,
        unit: receiptItem.unit,
        orderedQty: orderItem.quantity,
        receivedQty: receiptItem.receivedQty,
        unitPrice: orderItem.unitPrice,
        amount,
        paidAmount,
        receivedAt: receipt.receivedAt ? receipt.receivedAt.slice(0, 10) : '',
      })
    }
  }
  return items
}

/** 按明细推导对账单金额五件套（订单金额 / 应付 / 已付 / 待付）。 */
function deriveAmounts(items: ReconciliationItem[]) {
  const orderAmount = Math.round(items.reduce((sum, item) => sum + item.orderedQty * item.unitPrice, 0) * 100) / 100
  const payableAmount = Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100
  const paidAmount = Math.round(items.reduce((sum, item) => sum + item.paidAmount, 0) * 100) / 100
  return { orderAmount, payableAmount, paidAmount, unpaidAmount: payableAmount - paidAmount }
}

/** 由核心行组装对账单展示记录（明细实时推导，不落存储）。 */
export function toReconciliationRecord(row: ReconciliationRow): ReconciliationRecord {
  const receipts = row.receiptIds
    .map((receiptId) => receiptsMock.find((receipt) => receipt.id === receiptId))
    .filter((receipt) => receipt !== undefined)
  if (receipts.length !== row.receiptIds.length) {
    throw new Error(`对账单 ${row.code} 引用了不存在的收货单`)
  }
  const items = buildReconciliationItems(row.id, receipts)
  return {
    id: row.id,
    code: row.code,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    ...deriveAmounts(items),
    diffAmount: row.diffAmount,
    diffType: row.diffType,
    diffReason: row.diffReason,
    status: row.status,
    items,
    createdByName: row.createdByName,
    remark: row.remark,
    confirmedByName: row.confirmedByName,
    confirmedAt: row.confirmedAt,
    closedByName: row.closedByName,
    closedAt: row.closedAt,
    closedRemark: row.closedRemark,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** 已被任何对账单纳入的收货单 id（含草稿：防止同一单据重复对账）。 */
export function reconciledReceiptIdSet(): Set<string> {
  const ids = new Set<string>()
  for (const row of reconsMock) {
    for (const receiptId of row.receiptIds) ids.add(receiptId)
  }
  return ids
}

/**
 * 待对账单据池：收货单状态 = 已收货且未被任何对账单纳入。
 * 验收结论不影响对账资格（已收货即可对账，应付按实收口径）。
 */
export function buildReconciliationPool(): ReconciliationPoolRecord[] {
  const reconciled = reconciledReceiptIdSet()
  return (
    receiptsMock
      .filter((receipt) => receipt.status === 'received' && !reconciled.has(receipt.id))
      .map((receipt) => {
        const order = purchaseOrdersMock.find((candidate) => candidate.id === receipt.orderId)
        if (!order) throw new Error(`单据池引用了不存在的订单：${receipt.orderId}`)
        const items = buildReconciliationItems('pool', [receipt])
        const receivedQty = receipt.items.reduce((sum, item) => sum + item.receivedQty, 0)
        const first = receipt.items[0]
        return {
          receiptId: receipt.id,
          receiptCode: receipt.code,
          orderId: order.id,
          orderCode: order.code,
          supplierId: receipt.supplierId,
          supplierName: receipt.supplierName,
          productSummary:
            receipt.items.length === 1 ? first.productName : `${first.productName} 等 ${receipt.items.length} 项`,
          itemCount: receipt.items.length,
          receivedQty,
          payableAmount: items.reduce((sum, item) => sum + item.amount, 0),
          paidAmount: orderPaidAmountsMock[order.id] ?? 0,
          receivedAt: receipt.receivedAt ? receipt.receivedAt.slice(0, 10) : '',
        }
      })
      // 收货时间倒序：最近收货的单据优先对账。
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  )
}

/** 生成下一个对账单号：全局最大流水 + 1，日期段为当天（服务端生成口径）。 */
export function nextReconciliationCode(): string {
  const maxSeq = reconsMock.reduce((max, item) => Math.max(max, Number(item.code.slice(-4))), 0)
  return `RE${dayjs().format('YYYYMMDD')}${String(maxSeq + 1).padStart(4, '0')}`
}

/** 创建对账单核心行（handler 共用）：明细校验与金额推导由 handler 完成。 */
export function createReconciliationRow(
  payload: CreateReconciliationPayload & { createdByName: string },
): ReconciliationRow {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const supplier = suppliersMock.find((item) => item.id === payload.supplierId)
  if (!supplier) throw new Error(`创建对账单引用了不存在的供应商：${payload.supplierId}`)
  const row: ReconciliationRow = {
    id: `recon-${String(reconsMock.length + 1).padStart(3, '0')}`,
    code: nextReconciliationCode(),
    supplierId: payload.supplierId,
    supplierName: supplier.name,
    periodStart: payload.periodStart,
    periodEnd: payload.periodEnd,
    status: payload.submit ? 'pending' : 'draft',
    receiptIds: [...payload.receiptIds],
    createdByName: payload.createdByName,
    remark: payload.remark,
    createdAt: now,
    updatedAt: now,
  }
  reconsMock.push(row)
  return row
}

/** 对账单创建人展示名（按登录名取真实员工姓名）。 */
function operatorName(username: string): string {
  const user = findUserByUsername(username)
  if (!user) throw new Error(`对账操作人账号不存在：${username}`)
  return user.name
}

/**
 * 对账单种子（5 条覆盖全部状态，编号按创建时间全局递增）：
 * 金额由明细实时推导，此处只声明单据关系（按订单解析收货单）与状态时间线。
 */
type ReconSeed = Omit<ReconciliationRow, 'id' | 'receiptIds' | 'supplierName'> & { orderIds: string[] }

const RECON_SEEDS: ReconSeed[] = [
  {
    // 已关闭演示：po-003 货款两清（9 月期间，确认后付款完成关闭）。
    code: 'RE202609150001',
    supplierId: 'sup-001',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
    status: 'closed',
    orderIds: ['po-003'],
    createdByName: operatorName(FINANCE_OPERATOR),
    remark: '9 月复印纸货款对账',
    confirmedByName: operatorName(FINANCE_OPERATOR),
    confirmedAt: '2026-09-16 11:00:00',
    closedByName: operatorName(FINANCE_OPERATOR),
    closedAt: '2026-09-20 15:00:00',
    closedRemark: '关联付款完成，货款两清',
    createdAt: '2026-09-15 10:00:00',
    updatedAt: '2026-09-20 15:00:00',
  },
  {
    // 已确认演示：po-014 本月（10 月）对账，部分预付 1500。
    code: 'RE202610240002',
    supplierId: 'sup-002',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    status: 'confirmed',
    orderIds: ['po-014'],
    createdByName: operatorName(FINANCE_OPERATOR),
    remark: '10 月打印耗材对账',
    confirmedByName: operatorName(FINANCE_OPERATOR),
    confirmedAt: '2026-10-25 14:00:00',
    createdAt: '2026-10-24 10:00:00',
    updatedAt: '2026-10-25 14:00:00',
  },
  {
    // 有差异演示：po-015 应付与供应商送货单差 65 元，人工标记。
    code: 'RE202610250003',
    supplierId: 'sup-012',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    status: 'disputed',
    orderIds: ['po-015'],
    diffType: 'amount',
    diffAmount: 65,
    diffReason: '供应商送货单金额与订单应付差异 65 元，待与供应商核对后再确认',
    createdByName: operatorName(FINANCE_OPERATOR),
    remark: '日杂百货对账',
    createdAt: '2026-10-25 09:00:00',
    updatedAt: '2026-10-26 11:00:00',
  },
  {
    // 待确认演示：po-006 已提交等待财务核对（9 月期间补录对账）。
    code: 'RE202610260004',
    supplierId: 'sup-003',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
    status: 'pending',
    orderIds: ['po-006'],
    createdByName: operatorName(FINANCE_OPERATOR),
    remark: '9 月日化补货对账',
    createdAt: '2026-10-26 09:30:00',
    updatedAt: '2026-10-26 09:30:00',
  },
  {
    // 草稿演示：po-016 采购员协助发起，尚未提交（可编辑 / 提交）。
    code: 'RE202610270005',
    supplierId: 'sup-008',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    status: 'draft',
    orderIds: ['po-016'],
    createdByName: operatorName(PURCHASER_OPERATOR),
    remark: '文具月度对账（协助发起）',
    createdAt: '2026-10-27 15:00:00',
    updatedAt: '2026-10-27 15:00:00',
  },
]

/** 种子落库：订单 id → 已收货单 id（收货单由发货单派生，恒存在且 1:1）。 */
reconsMock.push(
  ...RECON_SEEDS.map((seed, index) => {
    const { orderIds, ...rest } = seed
    const receiptIds = orderIds.map((orderId) => {
      const receipt = receiptsMock.find((candidate) => candidate.orderId === orderId)
      if (!receipt) throw new Error(`对账单种子引用了没有已收货单的订单：${orderId}`)
      return receipt.id
    })
    const supplier = suppliersMock.find((item) => item.id === seed.supplierId)
    if (!supplier) throw new Error(`对账单种子引用了不存在的供应商：${seed.supplierId}`)
    // id 用 map 下标生成：push 尚未执行，reconsMock.length 在此恒为 0。
    return {
      id: `recon-${String(index + 1).padStart(3, '0')}`,
      ...rest,
      supplierName: supplier.name,
      receiptIds,
    }
  }),
)

/**
 * 对账汇总看板：四卡指标 + 近期待处理列表。
 * 「本月」以当前日期为准；已确认口径含已关闭（本月确认过的都算已对账）。
 */
export function buildReconciliationSummary(): ReconciliationSummary {
  const pool = buildReconciliationPool()
  const month = dayjs().format('YYYY-MM')
  const monthRecords = reconsMock.filter(
    (row) => ['confirmed', 'closed'].includes(row.status) && row.confirmedAt?.startsWith(month),
  )
  const monthAmounts = monthRecords.map((row) => toReconciliationRecord(row))
  const recentList = reconsMock
    .filter((row) => row.status === 'pending' || row.status === 'disputed')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map(toReconciliationRecord)
  return {
    poolAmount: Math.round(pool.reduce((sum, row) => sum + row.payableAmount, 0) * 100) / 100,
    poolCount: pool.length,
    monthConfirmedAmount: Math.round(monthAmounts.reduce((sum, row) => sum + row.payableAmount, 0) * 100) / 100,
    monthConfirmedCount: monthRecords.length,
    pendingConfirmCount: reconsMock.filter((row) => row.status === 'pending').length,
    disputedCount: reconsMock.filter((row) => row.status === 'disputed').length,
    recentList,
  }
}
