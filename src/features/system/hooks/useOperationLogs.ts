import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { operationLogService } from '@/features/system/services/operationLogService'
import type { PaginatedData } from '@/services/httpClient'
import type { OperationLogListParams, OperationLogRecord } from '@/features/system/types'

export const operationLogQueryKeys = {
  /** 操作日志查询共用的根 key。 */
  all: ['system', 'operation-logs'] as const,
  page: (params: OperationLogListParams) => [...operationLogQueryKeys.all, 'page', params] as const,
  /** 筛选下拉选项。 */
  options: () => [...operationLogQueryKeys.all, 'options'] as const,
}

export interface OperationLogsQuery {
  data: PaginatedData<OperationLogRecord> | null
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => Promise<unknown>
}

/** 操作日志分页查询：翻页时保留上一页数据，避免整表闪烁。 */
export function useOperationLogs(params: OperationLogListParams): OperationLogsQuery {
  const query = useQuery({
    queryKey: operationLogQueryKeys.page(params),
    queryFn: ({ signal }) => operationLogService.getPage(params, signal),
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

/** 日志筛选下拉选项（操作人 + 模块字典）。 */
export function useLogFilterOptions() {
  const query = useQuery({
    queryKey: operationLogQueryKeys.options(),
    queryFn: ({ signal }) => operationLogService.getOptions(signal),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  }
}
