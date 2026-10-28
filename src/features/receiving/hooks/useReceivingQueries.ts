import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { receivingService } from '../services/receivingService'
import type { InspectionListParams, ReceiptListParams } from '../types'

export const receivingQueryKeys = {
  /** 收货与验收查询共用的根 key：确认收货 / 提交验收会同时影响两类单据，整体失效。 */
  all: ['receiving'] as const,
  /** 收货单分页 key：筛选与分页参数全部进入 key。 */
  receipts: (params: ReceiptListParams) => [...receivingQueryKeys.all, 'receipts', 'page', params] as const,
  /** 收货单详情 key。 */
  receiptDetail: (id: string) => [...receivingQueryKeys.all, 'receipts', 'detail', id] as const,
  /** 验收单分页 key。 */
  inspections: (params: InspectionListParams) => [...receivingQueryKeys.all, 'inspections', 'page', params] as const,
  /** 验收单详情 key。 */
  inspectionDetail: (id: string) => [...receivingQueryKeys.all, 'inspections', 'detail', id] as const,
  /** 采购订单关联单据联查 key。 */
  orderDocuments: (orderId: string) => [...receivingQueryKeys.all, 'order-documents', orderId] as const,
}

/** 收货单分页查询：翻页时保留上一页数据，避免整表闪烁。 */
export function useReceipts(params: ReceiptListParams) {
  const query = useQuery({
    queryKey: receivingQueryKeys.receipts(params),
    queryFn: ({ signal }) => receivingService.getReceiptPage(params, signal),
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

/** 收货单详情（确认收货视图与详情视图共用）。 */
export function useReceiptDetail(id: string) {
  const query = useQuery({
    queryKey: receivingQueryKeys.receiptDetail(id),
    queryFn: ({ signal }) => receivingService.getReceiptDetail(id, signal),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 验收单分页查询：翻页时保留上一页数据。 */
export function useInspections(params: InspectionListParams) {
  const query = useQuery({
    queryKey: receivingQueryKeys.inspections(params),
    queryFn: ({ signal }) => receivingService.getInspectionPage(params, signal),
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

/** 验收单详情（验收操作视图与详情视图共用）。 */
export function useInspectionDetail(id: string) {
  const query = useQuery({
    queryKey: receivingQueryKeys.inspectionDetail(id),
    queryFn: ({ signal }) => receivingService.getInspectionDetail(id, signal),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 采购订单关联单据联查（收货单 / 验收单可能尚未生成，返回 null 字段）。 */
export function useOrderReceivingDocuments(orderId: string | undefined) {
  const query = useQuery({
    queryKey: receivingQueryKeys.orderDocuments(orderId ?? ''),
    queryFn: ({ signal }) => receivingService.getOrderDocuments(orderId!, signal),
    // 无 orderId（未关联场景）时不发请求。
    enabled: Boolean(orderId),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
  }
}
