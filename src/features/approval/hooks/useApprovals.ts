import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { approvalService } from '@/features/approval/services/approvalService'
import type { ApprovalProcessedListParams, ApprovalTaskListParams } from '@/features/approval/types'

export const approvalQueryKeys = {
  /** 审批中心查询共用的根 key：裁决 / 提交 / 撤回后整体失效（含徽标计数）。 */
  all: ['approval'] as const,
  /** 待办分页 key：筛选与分页参数全部进入 key，互不串缓存。 */
  pendingPage: (params: ApprovalTaskListParams) => [...approvalQueryKeys.all, 'pending-page', params] as const,
  /** 我已审批分页 key。 */
  processedPage: (params: ApprovalProcessedListParams) => [...approvalQueryKeys.all, 'processed-page', params] as const,
  /** 待办计数 key（侧边栏徽标）。 */
  pendingCount: () => [...approvalQueryKeys.all, 'pending-count'] as const,
}

/** 我的审批待办分页：翻页时保留上一页数据，避免整表闪烁。 */
export function useApprovalTasks(params: ApprovalTaskListParams) {
  const query = useQuery({
    queryKey: approvalQueryKeys.pendingPage(params),
    queryFn: ({ signal }) => approvalService.getPendingPage(params, signal),
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

/** 我已审批分页。 */
export function useApprovalProcessedRecords(params: ApprovalProcessedListParams) {
  const query = useQuery({
    queryKey: approvalQueryKeys.processedPage(params),
    queryFn: ({ signal }) => approvalService.getProcessedPage(params, signal),
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

/** 待办计数（侧边栏徽标）；enabled 由菜单权限控制，无审批权限不发请求。 */
export function useApprovalPendingCount(enabled: boolean) {
  const query = useQuery({
    queryKey: approvalQueryKeys.pendingCount(),
    queryFn: ({ signal }) => approvalService.getPendingCount(signal),
    enabled,
  })
  return {
    count: query.data ?? 0,
    isLoading: query.isPending,
  }
}
