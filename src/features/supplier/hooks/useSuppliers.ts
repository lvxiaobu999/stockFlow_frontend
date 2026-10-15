import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supplierService } from '@/features/supplier/services/supplierService'
import type { SupplierListParams, SupplierRecentOrder, SupplierRecord } from '@/features/supplier/types'
import type { PaginatedData } from '@/services/httpClient'

export const supplierQueryKeys = {
  /** 供应商查询共用的根 key，增删改后整体失效。 */
  all: ['supplier', 'suppliers'] as const,
  /** 分页查询 key：筛选与分页参数全部进入 key，保证不同查询互不串缓存。 */
  page: (params: SupplierListParams) => [...supplierQueryKeys.all, 'page', params] as const,
  /** 详情 key：id 为空字符串时不发起请求。 */
  detail: (id: string) => [...supplierQueryKeys.all, 'detail', id] as const,
  /** 近 5 笔订单（演示契约）key。 */
  recentOrders: (id: string) => [...supplierQueryKeys.all, 'recent-orders', id] as const,
}

/** 供应商分页查询：翻页时保留上一页数据（placeholderData），避免整表闪烁。 */
export function useSuppliers(params: SupplierListParams) {
  const query = useQuery({
    queryKey: supplierQueryKeys.page(params),
    queryFn: ({ signal }) => supplierService.getPage(params, signal),
    placeholderData: keepPreviousData,
  })

  return {
    data: (query.data ?? null) as PaginatedData<SupplierRecord> | null,
    isLoading: query.isPending,
    /** 翻页或失效后的重新请求中，用于表格的轻量 loading。 */
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/** 供应商详情；id 为空字符串时不发起请求（详情/编辑视图未打开）。 */
export function useSupplierDetail(id: string) {
  const query = useQuery({
    queryKey: supplierQueryKeys.detail(id),
    queryFn: ({ signal }) => supplierService.getDetail(id, signal),
    enabled: id !== '',
  })
  return {
    data: (query.data ?? null) as SupplierRecord | null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 供应商近 5 笔订单（演示契约）；id 为空字符串时不发起请求。 */
export function useSupplierRecentOrders(id: string) {
  const query = useQuery({
    queryKey: supplierQueryKeys.recentOrders(id),
    queryFn: ({ signal }) => supplierService.getRecentOrders(id, signal),
    enabled: id !== '',
  })
  return {
    data: (query.data ?? null) as SupplierRecentOrder[] | null,
    isLoading: query.isPending,
    error: query.error,
  }
}
