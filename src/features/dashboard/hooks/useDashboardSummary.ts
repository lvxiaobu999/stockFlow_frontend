import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import type { DashboardSummary } from '@/features/dashboard/types'

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
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
    queryFn: dashboardService.getSummary,
  })

  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}
