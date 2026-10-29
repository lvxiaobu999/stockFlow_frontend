import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { stockService } from '@/features/inventory/services/stockService'
import type {
  StockAlertListParams,
  StockAlertRecord,
  StockListParams,
  StockRecord,
  StockTransactionListParams,
  StockTransactionRecord,
} from '@/features/inventory/types'
import type { PaginatedData } from '@/services/httpClient'

/**
 * 库存域查询 key 与 Hooks：库存台账 / 流水 / 预警共用一个根 key，
 * 库存调整与验收入库后整体失效，商品档案（totalStock）与仓库统计
 * 投影由对应域的 key 承载（在 mutations 中一并失效）。
 */

export const stockQueryKeys = {
  /** 库存查询共用的根 key（台账 / 流水 / 预警）。 */
  all: ['inventory', 'stock'] as const,
  /** 当前库存分页 key：筛选与分页参数全部进入 key。 */
  stocks: (params: StockListParams) => [...stockQueryKeys.all, 'list', params] as const,
  /** 库存流水分页 key。 */
  transactions: (params: StockTransactionListParams) => [...stockQueryKeys.all, 'transactions', params] as const,
  /** 安全库存预警分页 key。 */
  alerts: (params: StockAlertListParams) => [...stockQueryKeys.all, 'alerts', params] as const,
}

/** 当前库存分页查询：翻页时保留上一页数据，避免整表闪烁。 */
export function useStocks(params: StockListParams) {
  const query = useQuery({
    queryKey: stockQueryKeys.stocks(params),
    queryFn: ({ signal }) => stockService.getStockPage(params, signal),
    placeholderData: keepPreviousData,
  })

  return {
    data: (query.data ?? null) as PaginatedData<StockRecord> | null,
    isLoading: query.isPending,
    /** 翻页或失效后的重新请求中，用于表格的轻量 loading。 */
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/** 库存流水分页查询。 */
export function useStockTransactions(params: StockTransactionListParams) {
  const query = useQuery({
    queryKey: stockQueryKeys.transactions(params),
    queryFn: ({ signal }) => stockService.getTransactionPage(params, signal),
    placeholderData: keepPreviousData,
  })

  return {
    data: (query.data ?? null) as PaginatedData<StockTransactionRecord> | null,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/** 安全库存预警分页查询。 */
export function useStockAlerts(params: StockAlertListParams) {
  const query = useQuery({
    queryKey: stockQueryKeys.alerts(params),
    queryFn: ({ signal }) => stockService.getAlertPage(params, signal),
    placeholderData: keepPreviousData,
  })

  return {
    data: (query.data ?? null) as PaginatedData<StockAlertRecord> | null,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}
