import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { purchaseOrderService } from '@/features/purchase/services/purchaseOrderService'
import type { PurchaseOrderListParams } from '@/features/purchase/types'

export const purchaseOrderQueryKeys = {
  /** 采购订单查询共用的根 key，任何写动作后整体失效。 */
  all: ['purchase', 'orders'] as const,
  /** 分页查询 key：筛选与分页参数全部进入 key，保证不同查询互不串缓存。 */
  page: (params: PurchaseOrderListParams) => [...purchaseOrderQueryKeys.all, 'page', params] as const,
  /** 详情 key。 */
  detail: (id: string) => [...purchaseOrderQueryKeys.all, 'detail', id] as const,
  /** 下一编号预览 key。 */
  nextCode: () => [...purchaseOrderQueryKeys.all, 'next-code'] as const,
}

/** 采购订单分页查询：翻页时保留上一页数据（placeholderData），避免整表闪烁。 */
export function usePurchaseOrders(params: PurchaseOrderListParams) {
  const query = useQuery({
    queryKey: purchaseOrderQueryKeys.page(params),
    queryFn: ({ signal }) => purchaseOrderService.getPage(params, signal),
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

/** 订单详情（状态时间线由前端从时间戳派生）。 */
export function usePurchaseOrderDetail(id: string) {
  const query = useQuery({
    queryKey: purchaseOrderQueryKeys.detail(id),
    queryFn: ({ signal }) => purchaseOrderService.getDetail(id, signal),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 预取下一个订单编号（新建表单展示用）。 */
export function useNextPurchaseOrderCode(enabled: boolean) {
  const query = useQuery({
    queryKey: purchaseOrderQueryKeys.nextCode(),
    queryFn: ({ signal }) => purchaseOrderService.getNextCode(signal),
    enabled,
  })
  return {
    code: query.data ?? null,
    isLoading: query.isPending,
  }
}
