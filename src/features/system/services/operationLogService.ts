import type { LogFilterOptions, OperationLogListParams, OperationLogRecord } from '@/features/system/types'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/** 操作日志服务：严格只读，导出由前端当前页 CSV 过渡实现。 */
export const operationLogService = {
  /** 分页查询审计日志；返回结构遵循 PaginatedData 约定（total 为总页数）。 */
  async getPage(params: OperationLogListParams, signal?: AbortSignal): Promise<PaginatedData<OperationLogRecord>> {
    return request<PaginatedData<OperationLogRecord>>('/system/operation-log/page', { params, signal })
  },

  /** 筛选下拉选项：操作人列表与模块字典。 */
  async getOptions(signal?: AbortSignal): Promise<LogFilterOptions> {
    return request<LogFilterOptions>('/system/operation-log/options', { signal })
  },
}
