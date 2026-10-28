import type {
  CreateSupplierPayload,
  SupplierListParams,
  SupplierOption,
  SupplierRecentOrder,
  SupplierRecord,
  UpdateSupplierPayload,
} from '@/features/supplier/types'
import type { EnableStatus } from '@/types/common'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/**
 * 供应商档案服务：编码服务端生成（SUP + 4 位流水）、创建后不可修改；
 * 门户账号在「用户管理」单独开通（MVP 一对一，按名称关联），此处不联动。
 */
export const supplierService = {
  /** 启用供应商下拉（采购订单选商与筛选共用；与商品 options 同款缓存策略）。 */
  async getOptions(signal?: AbortSignal): Promise<SupplierOption[]> {
    return request<SupplierOption[]>('/supplier/options', { signal })
  },

  /** 分页查询供应商；inTransit=true 时仅返回有在途订单的供应商。 */
  async getPage(params: SupplierListParams, signal?: AbortSignal): Promise<PaginatedData<SupplierRecord>> {
    return request<PaginatedData<SupplierRecord>>('/supplier/page', { params, signal })
  },

  /** 新建供应商；名称重复时后端返回业务码 4302。 */
  async create(payload: CreateSupplierPayload): Promise<SupplierRecord> {
    return request<SupplierRecord>('/supplier', { method: 'POST', data: payload })
  },

  /** 编辑供应商；编码不可修改（服务端忽略载荷中的编码字段）。 */
  async update(id: string, payload: UpdateSupplierPayload): Promise<SupplierRecord> {
    return request<SupplierRecord>(`/supplier/${id}`, { method: 'PUT', data: payload })
  },

  /** 启用 / 停用供应商。停用后不可被新采购订单引用，历史订单不受影响。 */
  async toggleStatus(id: string, status: EnableStatus): Promise<SupplierRecord> {
    return request<SupplierRecord>(`/supplier/${id}/status`, { method: 'PUT', data: { status } })
  },

  /** 供应商详情。 */
  async getDetail(id: string, signal?: AbortSignal): Promise<SupplierRecord> {
    return request<SupplierRecord>(`/supplier/${id}`, { signal })
  },

  /** 近 5 笔采购订单：采购模块落地前的演示契约。 */
  async getRecentOrders(id: string, signal?: AbortSignal): Promise<SupplierRecentOrder[]> {
    return request<SupplierRecentOrder[]>(`/supplier/${id}/recent-orders`, { signal })
  },
}
