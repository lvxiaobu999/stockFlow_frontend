import dayjs from 'dayjs'
import type { StockRecord, StockTransactionRecord } from '@/features/inventory/types'
import { calcStockAmount, isStockWarning } from '@/features/inventory/utils/stock'
import type { ProductRecord, ProductStockSummary, ProductStockTransaction } from '@/features/product/types'
import type { InspectionRecord } from '@/features/receiving/types'
import { inspectionsMock } from './receiving'
import { productsMock } from './products'
import { warehousesMock } from './warehouses'

/**
 * 库存 Mock 数据：当前库存（仓库 + 商品唯一）与库存流水（只增不改）。
 *
 * 演示数据完全由单据推导，保证「库存是多少、为什么是这个数」可追溯：
 * - 期初建账（type=adjust）：商品建档时点按权重拆分到启用仓（需求：期初走
 *   调整流水录入，禁止直接改库存数量）；
 * - 验收合格入库（type=inbound）：已落结论的验收单按合格数量在总仓入库
 *   （提交验收即入库，无二次「确认入库」），种子期与运行期共用同一实现；
 * - 库存数量 = 该仓商品流水 quantityAfter 链的末端；商品档案 totalStock 与
 *   仓库统计列由 syncInventoryProjections 实时回写，三侧始终保持一致；
 * - 出库流水缺位：销售出库属第二阶段，类型枚举保留 outbound。
 */

/** 库存行核心字段（数据库 inventory 表口径，展示快照由接口联表回填）。 */
export interface InventoryRow {
  id: string
  warehouseId: string
  productId: string
  /** 当前库存数量（非负，只能由流水推导更新）。 */
  quantity: number
  updatedAt: string
}

/** 库存流水核心字段（数据库 inventory_transaction 表口径，只增不改）。 */
export interface InventoryTransactionRow {
  id: string
  warehouseId: string
  productId: string
  type: StockTransactionRecord['type']
  /** 带符号变动数量（入库 / 正向调整为正）。 */
  quantity: number
  /** 变动后数量快照（与 inventory.quantity 的一致性由数据集测试保证）。 */
  quantityAfter: number
  /** 来源单据类型（如 purchase_order）；调整流水缺省。 */
  bizType?: string
  bizId?: string
  /** 来源单据号（冗余，便于展示）。 */
  bizCode?: string
  operatorName?: string
  remark?: string
  createdAt: string
}

export const inventoriesMock: InventoryRow[] = []
export const stockTransactionsMock: InventoryTransactionRow[] = []

/** 期初建账的启用仓拆分权重（总仓为主仓，与商品详情演示口径同源）。 */
const INITIAL_SPLIT_WEIGHTS = [0.45, 0.25, 0.18, 0.12]

/** 期初建账操作人轮换池（仓储部员工展示名）。 */
const INITIAL_OPERATORS = ['刘洋', '吴军', '冯逸']

/** 默认入库仓库：总仓。收货 / 验收链路未选仓，MVP 采购入库统一入总仓。 */
export const DEFAULT_WAREHOUSE =
  warehousesMock.find((warehouse) => warehouse.isHeadquarters && warehouse.status === 1) ?? warehousesMock[0]

/** 按仓库 + 商品取库存行，不存在则建零行（入库 / 调整的 get-or-create 语义）。 */
function getOrCreateInventory(warehouseId: string, productId: string, now: string): InventoryRow {
  const existing = inventoriesMock.find((row) => row.warehouseId === warehouseId && row.productId === productId)
  if (existing) return existing
  const created: InventoryRow = {
    id: `inv-${warehouseId}-${productId}`,
    warehouseId,
    productId,
    quantity: 0,
    updatedAt: now,
  }
  inventoriesMock.push(created)
  return created
}

/**
 * 投影回写：商品 totalStock = 各仓库存合计；仓库统计列（SKU 数 / 数量 / 金额）
 * 由库存行实时推导（金额口径 = 数量 × 采购参考价）。期初、入库、调整后都会
 * 调用，保证商品档案、仓库列表与库存流水三侧始终一致。
 */
export function syncInventoryProjections(): void {
  const stockByProduct = new Map<string, number>()
  const statByWarehouse = new Map<string, { skuCount: number; quantity: number; amount: number }>()
  for (const row of inventoriesMock) {
    stockByProduct.set(row.productId, (stockByProduct.get(row.productId) ?? 0) + row.quantity)
    const stat = statByWarehouse.get(row.warehouseId) ?? { skuCount: 0, quantity: 0, amount: 0 }
    if (row.quantity > 0) stat.skuCount += 1
    stat.quantity += row.quantity
    stat.amount += calcStockAmount(
      row.quantity,
      productsMock.find((item) => item.id === row.productId)?.purchasePrice ?? 0,
    )
    statByWarehouse.set(row.warehouseId, stat)
  }
  for (const product of productsMock) {
    product.totalStock = stockByProduct.get(product.id) ?? 0
  }
  for (const warehouse of warehousesMock) {
    const stat = statByWarehouse.get(warehouse.id)
    warehouse.stockSkuCount = stat?.skuCount ?? 0
    warehouse.stockQuantity = stat?.quantity ?? 0
    warehouse.stockAmount = stat ? Math.round(stat.amount * 100) / 100 : 0
  }
}

/**
 * 验收合格入库：按验收单各明细的合格数量在总仓生成入库流水并累加库存。
 * 种子期（已落结论的演示验收单）与运行期（receivingHandlers 提交验收）共用；
 * 幂等性由「验收单仅可提交一次」的状态机保证，此处不重复校验。
 */
export function applyInboundForInspection(inspection: InspectionRecord): void {
  const occurredAt = inspection.inspectedAt ?? dayjs().format('YYYY-MM-DD HH:mm:ss')
  for (const item of inspection.items) {
    if (item.qualifiedQty <= 0) continue
    const row = getOrCreateInventory(DEFAULT_WAREHOUSE.id, item.productId, occurredAt)
    row.quantity += item.qualifiedQty
    row.updatedAt = occurredAt
    stockTransactionsMock.push({
      id: `it-${String(stockTransactionsMock.length + 1).padStart(3, '0')}`,
      warehouseId: DEFAULT_WAREHOUSE.id,
      productId: item.productId,
      type: 'inbound',
      quantity: item.qualifiedQty,
      quantityAfter: row.quantity,
      bizType: 'purchase_order',
      bizId: inspection.orderId,
      bizCode: inspection.orderCode,
      operatorName: inspection.inspectedByName,
      remark: `验收合格入库（验收单 ${inspection.code}）`,
      createdAt: occurredAt,
    })
  }
  syncInventoryProjections()
}

/**
 * 库存调整（期初录入与纠错同一入口）：写调整流水并推导更新库存，
 * 禁止绕过流水直接改数量。调整后数量的非负校验由 handler 层完成。
 */
export function adjustInventoryStock(params: {
  warehouseId: string
  productId: string
  changeQty: number
  remark?: string
  operatorName: string
  now: string
}): InventoryRow {
  const row = getOrCreateInventory(params.warehouseId, params.productId, params.now)
  const quantityAfter = row.quantity + params.changeQty
  row.quantity = quantityAfter
  row.updatedAt = params.now
  stockTransactionsMock.push({
    id: `it-${String(stockTransactionsMock.length + 1).padStart(3, '0')}`,
    warehouseId: params.warehouseId,
    productId: params.productId,
    type: 'adjust',
    quantity: params.changeQty,
    quantityAfter,
    operatorName: params.operatorName,
    remark: params.remark,
    createdAt: params.now,
  })
  syncInventoryProjections()
  return row
}

;(() => {
  const enabledWarehouses = warehousesMock.filter((warehouse) => warehouse.status === 1)
  // 已落结论的验收单按验收时间升序，入库流水时序与业务时序一致。
  const settledInspections = inspectionsMock
    .filter((inspection) => inspection.inspectedAt !== undefined)
    .sort((a, b) => a.inspectedAt!.localeCompare(b.inspectedAt!))

  // 商品维度的验收入库合计，用于反推期初建账基数（期初 + 入库 = 档案总库存）。
  const inboundByProduct = new Map<string, number>()
  for (const inspection of settledInspections) {
    for (const item of inspection.items) {
      if (item.qualifiedQty > 0) {
        inboundByProduct.set(item.productId, (inboundByProduct.get(item.productId) ?? 0) + item.qualifiedQty)
      }
    }
  }

  // 1) 期初建账：基数 = 档案总库存 − 后续验收入库，按权重拆分到启用仓；
  //    拆分尾差归入最后一仓，拆分数量为 0 的仓不建库存行。
  let seq = 0
  for (const [index, product] of productsMock.entries()) {
    const preTotal = product.totalStock - (inboundByProduct.get(product.id) ?? 0)
    if (preTotal < 0) {
      throw new Error(`商品 ${product.name} 的验收入库数量超过档案总库存，期初建账无法成立`)
    }
    let allocated = 0
    enabledWarehouses.forEach((warehouse, warehouseIndex) => {
      const isLast = warehouseIndex === enabledWarehouses.length - 1
      const quantity = isLast ? preTotal - allocated : Math.floor(preTotal * INITIAL_SPLIT_WEIGHTS[warehouseIndex])
      allocated += quantity
      if (quantity <= 0) return
      seq += 1
      // 各仓建账时间错开几分钟，保证流水时序稳定可排序。
      const createdAt = dayjs(product.createdAt)
        .add(warehouseIndex + 1, 'minute')
        .format('YYYY-MM-DD HH:mm:ss')
      inventoriesMock.push({
        id: `inv-${warehouse.id}-${product.id}`,
        warehouseId: warehouse.id,
        productId: product.id,
        quantity,
        updatedAt: createdAt,
      })
      stockTransactionsMock.push({
        id: `it-${String(seq).padStart(3, '0')}`,
        warehouseId: warehouse.id,
        productId: product.id,
        type: 'adjust',
        quantity,
        quantityAfter: quantity,
        operatorName: INITIAL_OPERATORS[index % INITIAL_OPERATORS.length],
        remark: '期初建账',
        createdAt,
      })
    })
  }

  // 2) 验收合格入库：复用运行期同一实现，合格数量在总仓入库。
  for (const inspection of settledInspections) {
    applyInboundForInspection(inspection)
  }

  // 3) 投影回写：商品档案与仓库统计以库存流水为准（数值上与种子一致，
  //    但从此由流水推导，运行期入库 / 调整后仍然成立）。
  syncInventoryProjections()
})()

/** 联表组装库存列表行（商品与仓库展示快照实时回填，不落存储）。 */
export function toStockRecord(row: InventoryRow): StockRecord {
  const product = productsMock.find((item) => item.id === row.productId)
  const warehouse = warehousesMock.find((item) => item.id === row.warehouseId)
  if (!product || !warehouse) throw new Error(`库存行引用了不存在的商品或仓库：${row.id}`)
  return {
    id: row.id,
    warehouseId: row.warehouseId,
    warehouseName: warehouse.name,
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    spec: product.spec,
    unit: product.unit,
    categoryId: product.categoryId,
    quantity: row.quantity,
    safetyStock: product.safetyStock,
    purchasePrice: product.purchasePrice,
    updatedAt: row.updatedAt,
  }
}

/** 联表组装库存流水行。 */
export function toStockTransactionRecord(row: InventoryTransactionRow): StockTransactionRecord {
  const record = toStockRecord({ ...row, updatedAt: row.createdAt })
  return {
    id: row.id,
    warehouseId: row.warehouseId,
    warehouseName: record.warehouseName,
    productId: row.productId,
    productCode: record.productCode,
    productName: record.productName,
    spec: record.spec,
    unit: record.unit,
    type: row.type,
    quantity: row.quantity,
    quantityAfter: row.quantityAfter,
    bizType: row.bizType,
    bizCode: row.bizCode,
    operatorName: row.operatorName,
    remark: row.remark,
    createdAt: row.createdAt,
  }
}

/**
 * 商品「库存汇总（按仓库）」：由真实库存行组装（商品详情页数据块）。
 * 预警判定用 ≤ 口径（与安全库存预警列表一致）。
 */
export function buildProductStockSummary(product: ProductRecord): ProductStockSummary {
  const rows = inventoriesMock
    .filter((row) => row.productId === product.id)
    .map((row) => {
      const warehouse = warehousesMock.find((item) => item.id === row.warehouseId)
      return {
        warehouseId: row.warehouseId,
        warehouseName: warehouse?.name ?? row.warehouseId,
        stock: row.quantity,
        warning: isStockWarning(row.quantity, product.safetyStock),
        lastChangeAt: row.updatedAt,
      }
    })
    .sort((a, b) => a.warehouseName.localeCompare(b.warehouseName))
  return {
    totalStock: rows.reduce((sum, row) => sum + row.stock, 0),
    safetyStock: product.safetyStock,
    rows,
  }
}

/**
 * 商品「最近库存流水」：真实流水映射为商品详情的展示行。
 * 库存模块的调整流水按变动方向映射为入 / 出（商品详情契约仅区分方向）。
 */
export function buildProductRecentTransactions(product: ProductRecord, limit = 5): ProductStockTransaction[] {
  return stockTransactionsMock
    .filter((row) => row.productId === product.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((row) => {
      const warehouse = warehousesMock.find((item) => item.id === row.warehouseId)
      const direction =
        row.type === 'inbound'
          ? ('in' as const)
          : row.type === 'outbound'
            ? ('out' as const)
            : row.quantity >= 0
              ? ('in' as const)
              : ('out' as const)
      return {
        id: row.id,
        occurredAt: row.createdAt,
        type: direction,
        quantity: Math.abs(row.quantity),
        afterStock: row.quantityAfter,
        relatedOrderNo: row.bizCode,
        operator: row.operatorName ?? '—',
        warehouseName: warehouse?.name,
      }
    })
}
