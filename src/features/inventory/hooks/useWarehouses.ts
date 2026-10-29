import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { warehouseService } from '@/features/inventory/services/warehouseService'
import type { WarehouseListParams, WarehouseRecord } from '@/features/inventory/types'
import type { PaginatedData } from '@/services/httpClient'

export const warehouseQueryKeys = {
  /** 仓库查询共用的根 key，增删改后整体失效。 */
  all: ['inventory', 'warehouses'] as const,
  /** 分页查询 key：筛选与分页参数全部进入 key，保证不同查询互不串缓存。 */
  page: (params: WarehouseListParams) => [...warehouseQueryKeys.all, 'page', params] as const,
}

/** 仓库分页查询：翻页时保留上一页数据（placeholderData），避免整表闪烁。 */
export function useWarehouses(params: WarehouseListParams) {
  const query = useQuery({
    queryKey: warehouseQueryKeys.page(params),
    queryFn: ({ signal }) => warehouseService.getPage(params, signal),
    placeholderData: keepPreviousData,
  })

  return {
    data: (query.data ?? null) as PaginatedData<WarehouseRecord> | null,
    isLoading: query.isPending,
    /** 翻页或失效后的重新请求中，用于表格的轻量 loading。 */
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/** 仓库下拉选项：仅启用仓（停用仓不再发生库存变动，历史流水仍可见）。 */
export function useWarehouseOptions() {
  const { data, isLoading, error } = useWarehouses({ current: 1, pageSize: 99 })
  const options = (data?.lists ?? []).map((warehouse) => ({
    label: warehouse.name,
    value: warehouse.id,
  }))
  return { data: options, isLoading, error }
}
