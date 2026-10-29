import type {
  StockAdjustPayload,
  StockAlertListParams,
  StockAlertRecord,
  StockListParams,
  StockRecord,
  StockTransactionListParams,
  StockTransactionRecord,
} from '@/features/inventory/types'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/**
 * 库存服务：当前库存 / 库存调整 / 库存流水 / 安全库存预警。
 * 库存数量只能由流水推导更新（服务端在同一变更内写流水 + 更新库存）。
 */
export const stockService = {
  /** 分页查询当前库存（仓库 + 商品维度）。 */
  async getStockPage(params: StockListParams, signal?: AbortSignal): Promise<PaginatedData<StockRecord>> {
    return request<PaginatedData<StockRecord>>('/inventory/stock/page', { params, signal })
  },

  /**
   * 库存调整（期初录入 / 纠错同一入口）：changeQty 带符号整数（+ 入 − 出）。
   * 调整后库存为负（4902）、仓库停用（4903）等由后端拦截。
   */
  async adjustStock(payload: StockAdjustPayload): Promise<StockRecord> {
    return request<StockRecord>('/inventory/stock/adjust', { method: 'POST', data: payload })
  },

  /** 分页查询库存流水（只增不改，按发生时间倒序）。 */
  async getTransactionPage(
    params: StockTransactionListParams,
    signal?: AbortSignal,
  ): Promise<PaginatedData<StockTransactionRecord>> {
    return request<PaginatedData<StockTransactionRecord>>('/inventory/transaction/page', { params, signal })
  },

  /** 分页查询安全库存预警（当前库存 ≤ 安全库存，缺口大的在前）。 */
  async getAlertPage(params: StockAlertListParams, signal?: AbortSignal): Promise<PaginatedData<StockAlertRecord>> {
    return request<PaginatedData<StockAlertRecord>>('/inventory/stock/alert', { params, signal })
  },
}
