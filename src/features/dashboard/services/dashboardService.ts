import type { DashboardSummary } from '@/features/dashboard/types'
import { apiClient } from '@/services/httpClient'

/** 本地开发由 MSW 接管请求，生产环境自动请求真实 API，业务层无需改变。 */
export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get<DashboardSummary>('/dashboard/summary')
    return response.data
  },
}
