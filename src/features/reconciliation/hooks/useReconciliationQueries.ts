import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { reconciliationService } from '../services/reconciliationService'
import type { ReconciliationListParams, ReconciliationPoolParams } from '../types'

export const reconciliationQueryKeys = {
  /** 对账域查询共用的根 key：任意写动作都会整体失效（列表 / 详情 / 单据池 / 汇总联动）。 */
  all: ['reconciliation'] as const,
  /** 对账单分页 key：筛选与分页参数全部进入 key。 */
  page: (params: ReconciliationListParams) => [...reconciliationQueryKeys.all, 'page', params] as const,
  /** 对账单详情 key。 */
  detail: (id: string) => [...reconciliationQueryKeys.all, 'detail', id] as const,
  /** 待对账单据池分页 key。 */
  pool: (params: ReconciliationPoolParams) => [...reconciliationQueryKeys.all, 'pool', params] as const,
  /** 汇总看板 key（无参数）。 */
  summary: () => [...reconciliationQueryKeys.all, 'summary'] as const,
}

/** 对账单分页查询：翻页时保留上一页数据，避免整表闪烁。 */
export function useReconciliations(params: ReconciliationListParams) {
  const query = useQuery({
    queryKey: reconciliationQueryKeys.page(params),
    queryFn: ({ signal }) => reconciliationService.getReconciliationPage(params, signal),
    placeholderData: keepPreviousData,
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    /** 筛选 / 翻页 / 失效后的重新请求中，用于表格的轻量 loading。 */
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/** 对账单详情（详情视图 / 确认视图 / 草稿编辑共用）。 */
export function useReconciliationDetail(id: string | undefined) {
  const query = useQuery({
    queryKey: reconciliationQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => reconciliationService.getReconciliationDetail(id!, signal),
    // 无 id（非详情态）时不发请求。
    enabled: Boolean(id),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 待对账单据池分页查询：翻页时保留上一页数据。 */
export function useReconciliationPool(params: ReconciliationPoolParams) {
  const query = useQuery({
    queryKey: reconciliationQueryKeys.pool(params),
    queryFn: ({ signal }) => reconciliationService.getPendingPool(params, signal),
    placeholderData: keepPreviousData,
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/** 对账汇总看板：四卡指标 + 近期待处理列表。 */
export function useReconciliationSummary() {
  const query = useQuery({
    queryKey: reconciliationQueryKeys.summary(),
    queryFn: ({ signal }) => reconciliationService.getSummary(signal),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}
