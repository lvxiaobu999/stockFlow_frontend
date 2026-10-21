import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { purchaseRequestService } from '@/features/purchase/services/purchaseRequestService'
import type { PurchaseRequestDetail, PurchaseRequestListParams } from '@/features/purchase/types'

export const purchaseRequestQueryKeys = {
  /** 采购申请查询共用的根 key，任何写动作后整体失效。 */
  all: ['purchase', 'requests'] as const,
  /** 分页查询 key：筛选与分页参数全部进入 key，保证不同查询互不串缓存。 */
  page: (params: PurchaseRequestListParams) => [...purchaseRequestQueryKeys.all, 'page', params] as const,
  /** 详情 key（含审批流水）。 */
  detail: (id: string) => [...purchaseRequestQueryKeys.all, 'detail', id] as const,
  /** 下一编号预览 key。 */
  nextCode: () => [...purchaseRequestQueryKeys.all, 'next-code'] as const,
}

/** 采购申请分页查询：翻页时保留上一页数据（placeholderData），避免整表闪烁。 */
export function usePurchaseRequests(params: PurchaseRequestListParams) {
  const query = useQuery({
    queryKey: purchaseRequestQueryKeys.page(params),
    queryFn: ({ signal }) => purchaseRequestService.getPage(params, signal),
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

/** 申请详情（含审批流水时间线）。 */
export function usePurchaseRequestDetail(id: string) {
  const query = useQuery({
    queryKey: purchaseRequestQueryKeys.detail(id),
    queryFn: ({ signal }) => purchaseRequestService.getDetail(id, signal),
  })
  return {
    data: (query.data ?? null) as PurchaseRequestDetail | null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 预取下一个申请编号（新建表单展示用）。 */
export function useNextPurchaseRequestCode(enabled: boolean) {
  const query = useQuery({
    queryKey: purchaseRequestQueryKeys.nextCode(),
    queryFn: ({ signal }) => purchaseRequestService.getNextCode(signal),
    enabled,
  })
  return {
    code: query.data ?? null,
    isLoading: query.isPending,
  }
}
