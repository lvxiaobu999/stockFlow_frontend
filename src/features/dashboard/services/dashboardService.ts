import type { DashboardSummary } from '@/features/dashboard/types'
import { request } from '@/services/httpClient'

/** 本地开发由 MSW 接管请求，生产环境自动请求真实 API，业务层无需改变。 */
export const dashboardService = {
  /**
   * 获取工作台汇总数据。
   *
   * TanStack Query 会在查询失效、组件卸载或重新发起请求时触发 signal，
   * 这里把它继续传给 request，Axios 才能真正中止底层网络请求。
   */
  async getSummary(signal?: AbortSignal): Promise<DashboardSummary> {
    return request<DashboardSummary>('/dashboard/summary', { signal })
  },
}
