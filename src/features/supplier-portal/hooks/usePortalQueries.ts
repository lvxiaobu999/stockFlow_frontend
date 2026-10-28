import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { portalService } from '../services/portalService'
import type { PortalOrderListParams, ShipmentListParams } from '../types'

export const portalQueryKeys = {
  /** 门户查询共用的根 key：订单动作会同时影响订单 / 统计 / 发货记录，整体失效。 */
  all: ['supplier-portal'] as const,
  /** 首页统计 key。 */
  summary: () => [...portalQueryKeys.all, 'summary'] as const,
  /** 我的订单分页 key：筛选与分页参数全部进入 key。 */
  orders: (params: PortalOrderListParams) => [...portalQueryKeys.all, 'orders', 'page', params] as const,
  /** 订单详情 key。 */
  orderDetail: (id: string) => [...portalQueryKeys.all, 'orders', 'detail', id] as const,
  /** 发货记录分页 key。 */
  shipments: (params: ShipmentListParams) => [...portalQueryKeys.all, 'shipments', 'page', params] as const,
}

/** 首页统计（数字卡片）。 */
export function usePortalSummary() {
  const query = useQuery({
    queryKey: portalQueryKeys.summary(),
    queryFn: ({ signal }) => portalService.getSummary(signal),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 我的采购订单分页查询：翻页时保留上一页数据，避免整表闪烁。 */
export function usePortalOrders(params: PortalOrderListParams) {
  const query = useQuery({
    queryKey: portalQueryKeys.orders(params),
    queryFn: ({ signal }) => portalService.getOrderPage(params, signal),
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

/** 订单详情（门户详情视图使用）。 */
export function usePortalOrderDetail(id: string) {
  const query = useQuery({
    queryKey: portalQueryKeys.orderDetail(id),
    queryFn: ({ signal }) => portalService.getOrderDetail(id, signal),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 发货记录分页查询：翻页时保留上一页数据。 */
export function usePortalShipments(params: ShipmentListParams) {
  const query = useQuery({
    queryKey: portalQueryKeys.shipments(params),
    queryFn: ({ signal }) => portalService.getShipmentPage(params, signal),
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
