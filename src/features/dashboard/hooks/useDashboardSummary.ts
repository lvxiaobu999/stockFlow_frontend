import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import type { DashboardSummary } from '@/features/dashboard/types'

export const dashboardQueryKeys = {
  // 所有工作台查询共用同一个根 key，便于后续统一失效或刷新缓存。
  all: ['dashboard'] as const,
  // 汇总数据使用独立子 key，避免和其它工作台接口的缓存相互覆盖。
  summary: () => [...dashboardQueryKeys.all, 'summary'] as const,
}

interface DashboardQuery {
  data: DashboardSummary | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<unknown>
}

export function useDashboardSummary(): DashboardQuery {
  const query = useQuery({
    queryKey: dashboardQueryKeys.summary(),
    // queryFn 的上下文包含 Query 管理的 AbortSignal，必须显式传给 service。
    queryFn: ({ signal }) => dashboardService.getSummary(signal),
  })

  return {
    // 页面只接收领域数据；查询尚未成功时统一转换为 null，减少空值分支。
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}
