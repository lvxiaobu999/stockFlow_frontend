import dayjs from 'dayjs'
import { delay, http } from 'msw'
import type { StockAdjustPayload, StockRecord, StockTransactionType } from '@/features/inventory/types'
import { isStockWarning } from '@/features/inventory/utils/stock'
import { getMockSession } from '@/mocks/data/auth'
import { collectDescendantIds } from '@/mocks/data/categories'
import {
  adjustInventoryStock,
  inventoriesMock,
  stockTransactionsMock,
  toStockRecord,
  toStockTransactionRecord,
} from '@/mocks/data/inventory'
import { productsMock } from '@/mocks/data/products'
import { warehousesMock } from '@/mocks/data/warehouses'
import { appendLog } from '@/mocks/data/operation-logs'
import { paginate } from '@/mocks/pagination'
import { businessError, httpError, ok } from '@/mocks/utils'

/**
 * 库存接口：当前库存分页、库存调整、库存流水分页与安全库存预警。
 *
 * 库存数量只能由流水推导更新（数据库设计业务约束）：调整在同一变更内
 * 「写调整流水 + 更新库存」，验收入库由 receivingHandlers 提交验收时驱动。
 *
 * 错误码分段（49xx）：4901 调整数量须为非零整数、4902 调整后库存为负、
 * 4903 仓库不存在或已停用、4904 商品不存在；通用段沿用 40xx（4001 参数缺失）。
 */
const ADJUST_PAYLOAD_INVALID = 4901
const STOCK_INSUFFICIENT = 4902
const WAREHOUSE_UNAVAILABLE = 4903
const PRODUCT_NOT_FOUND = 4904

/** 库存接口的登录校验：内部管理端接口，未登录一律 401。 */
function requireSession() {
  const session = getMockSession()
  if (!session) return { session: undefined, error: httpError(401, '登录已过期，请重新登录') }
  return { session, error: undefined }
}

/** 库存审计日志便捷封装（模块固定为库存管理）。 */
function logInventory(operator: string, action: string, targetSummary: string): void {
  appendLog({ operator, module: 'inventory', action, targetSummary })
}

/** 库存接口：库存分页 / 调整 / 流水分页 / 安全库存预警。 */
export const inventoryHandlers = [
  http.get('*/api/inventory/stock/page', async ({ request }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const url = new URL(request.url)
    const current = Number(url.searchParams.get('current') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    const warehouseId = url.searchParams.get('warehouseId') || undefined
    const categoryId = url.searchParams.get('categoryId') || undefined
    const keyword = url.searchParams.get('keyword')?.trim()
    const warningOnly = url.searchParams.get('warningOnly') === 'true'

    // 分类匹配所选分类及其全部子分类（与商品列表口径一致）。
    const categoryIds = categoryId
      ? (() => {
          const ids = collectDescendantIds(categoryId)
          ids.add(categoryId)
          return ids
        })()
      : null
    const records: StockRecord[] = inventoriesMock
      .filter((row) => (warehouseId ? row.warehouseId === warehouseId : true))
      .filter((row) => {
        if (!categoryIds) return true
        const product = productsMock.find((item) => item.id === row.productId)
        return product ? categoryIds.has(product.categoryId) : false
      })
      .map(toStockRecord)
      .filter((record) =>
        keyword ? `${record.productCode}${record.productName}${record.spec}`.includes(keyword) : true,
      )
      .filter((record) => (warningOnly ? isStockWarning(record.quantity, record.safetyStock) : true))
      // 最近有变动的库存行排前面，与「实时库存台账」的阅读顺序一致。
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return ok(paginate(records, current, pageSize))
  }),

  http.post('*/api/inventory/stock/adjust', async ({ request }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const payload = (await request.json()) as Partial<StockAdjustPayload>
    const warehouse = warehousesMock.find((item) => item.id === payload.warehouseId)
    if (!warehouse || warehouse.status === 0) return businessError(WAREHOUSE_UNAVAILABLE, '仓库不存在或已停用')
    const product = productsMock.find((item) => item.id === payload.productId)
    if (!product) return businessError(PRODUCT_NOT_FOUND, '商品不存在')
    // 调整数量必须为非零整数：+ 入 − 出，0 无法构成一次有效的调整流水。
    if (!Number.isInteger(payload.changeQty) || (payload.changeQty ?? 0) === 0) {
      return businessError(ADJUST_PAYLOAD_INVALID, '调整数量须为非零整数（+ 入 − 出）')
    }
    const row = inventoriesMock.find((item) => item.warehouseId === warehouse.id && item.productId === product.id)
    // MVP 非负库存口径：调整后数量为负直接拦截（严格禁止策略第二阶段再配）。
    if ((row?.quantity ?? 0) + payload.changeQty! < 0) {
      return businessError(STOCK_INSUFFICIENT, `调整后库存不能为负（当前库存 ${row?.quantity ?? 0}）`)
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    adjustInventoryStock({
      warehouseId: warehouse.id,
      productId: product.id,
      changeQty: payload.changeQty!,
      remark: payload.remark?.trim() || undefined,
      operatorName: admission.session.user.name,
      now,
    })
    logInventory(
      admission.session.user.name,
      '库存调整',
      `商品 ${product.name} @ ${warehouse.name}（${payload.changeQty! > 0 ? '+' : ''}${payload.changeQty}）`,
    )
    const updated = toStockRecord(
      inventoriesMock.find((item) => item.warehouseId === warehouse.id && item.productId === product.id)!,
    )
    return ok(updated)
  }),

  http.get('*/api/inventory/transaction/page', async ({ request }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const url = new URL(request.url)
    const current = Number(url.searchParams.get('current') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    const warehouseId = url.searchParams.get('warehouseId') || undefined
    const productId = url.searchParams.get('productId') || undefined
    const type = (url.searchParams.get('type') || undefined) as StockTransactionType | undefined
    const keyword = url.searchParams.get('keyword')?.trim()
    const createdFrom = url.searchParams.get('createdFrom') ?? undefined
    const createdTo = url.searchParams.get('createdTo') ?? undefined

    // keyword 同时匹配来源单据号与商品编码 / 名称（库存列表下钻按 productId 精确定位）。
    const records = stockTransactionsMock
      .filter((row) => (warehouseId ? row.warehouseId === warehouseId : true))
      .filter((row) => (productId ? row.productId === productId : true))
      .filter((row) => (type ? row.type === type : true))
      .map(toStockTransactionRecord)
      .filter((record) =>
        keyword ? `${record.bizCode ?? ''}${record.productCode}${record.productName}`.includes(keyword) : true,
      )
      .filter((record) => {
        const createdDate = record.createdAt.slice(0, 10)
        if (createdFrom && createdDate < createdFrom) return false
        if (createdTo && createdDate > createdTo) return false
        return true
      })
      // 流水只增不改，按发生时间倒序展示（最新在前）。
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return ok(paginate(records, current, pageSize))
  }),

  http.get('*/api/inventory/stock/alert', async ({ request }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const url = new URL(request.url)
    const current = Number(url.searchParams.get('current') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    const warehouseId = url.searchParams.get('warehouseId') || undefined

    // 最近入库时间按「仓库 + 商品」维度取最新入库流水（补货优先级参考）。
    const lastInboundAtByKey = new Map<string, string>()
    for (const row of stockTransactionsMock) {
      if (row.type !== 'inbound') continue
      const key = `${row.warehouseId}|${row.productId}`
      const currentAt = lastInboundAtByKey.get(key)
      if (!currentAt || row.createdAt > currentAt) lastInboundAtByKey.set(key, row.createdAt)
    }
    const records = inventoriesMock
      .filter((row) => (warehouseId ? row.warehouseId === warehouseId : true))
      .map(toStockRecord)
      .filter((record) => isStockWarning(record.quantity, record.safetyStock))
      .map((record) => ({
        warehouseId: record.warehouseId,
        warehouseName: record.warehouseName,
        productId: record.productId,
        productCode: record.productCode,
        productName: record.productName,
        spec: record.spec,
        unit: record.unit,
        quantity: record.quantity,
        safetyStock: record.safetyStock,
        gap: record.safetyStock - record.quantity,
        lastInboundAt: lastInboundAtByKey.get(`${record.warehouseId}|${record.productId}`),
        updatedAt: record.updatedAt,
      }))
      // 缺口大的排前面（补货优先级 = 距安全库存的距离）。
      .sort((a, b) => b.gap - a.gap)
    return ok(paginate(records, current, pageSize))
  }),
]
