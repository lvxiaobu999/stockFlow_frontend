import type {
  CreateWarehousePayload,
  UpdateWarehousePayload,
  WarehouseListParams,
  WarehouseRecord,
} from '@/features/inventory/types'
import type { EnableStatus } from '@/types/common'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/**
 * 仓库档案服务：编码服务端生成（WH + 3 位流水）、创建后不可修改；
 * 总仓为内置默认仓库不允许停用（业务码 4403）。
 */
export const warehouseService = {
  /** 分页查询仓库。 */
  async getPage(params: WarehouseListParams, signal?: AbortSignal): Promise<PaginatedData<WarehouseRecord>> {
    return request<PaginatedData<WarehouseRecord>>('/inventory/warehouse/page', { params, signal })
  },

  /** 新建仓库；名称重复时后端返回业务码 4402。 */
  async create(payload: CreateWarehousePayload): Promise<WarehouseRecord> {
    return request<WarehouseRecord>('/inventory/warehouse', { method: 'POST', data: payload })
  },

  /** 编辑仓库；编码不可修改（服务端忽略载荷中的编码字段）。 */
  async update(id: string, payload: UpdateWarehousePayload): Promise<WarehouseRecord> {
    return request<WarehouseRecord>(`/inventory/warehouse/${id}`, { method: 'PUT', data: payload })
  },

  /** 启用 / 停用仓库；总仓停用被后端拦截（4403）。 */
  async toggleStatus(id: string, status: EnableStatus): Promise<WarehouseRecord> {
    return request<WarehouseRecord>(`/inventory/warehouse/${id}/status`, {
      method: 'PUT',
      data: { status },
    })
  },
}
