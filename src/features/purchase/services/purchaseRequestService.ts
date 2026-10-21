import type {
  PurchaseRequestDetail,
  PurchaseRequestListParams,
  PurchaseRequestRecord,
  SavePurchaseRequestPayload,
} from '@/features/purchase/types'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/**
 * 采购申请服务：编号服务端生成（PR + 日期 + 4 位流水）、创建后不可修改；
 * 申请人固定为当前登录用户；状态流转全部走独立动作接口（提交 / 撤回），
 * 前端不可直接改写 status（状态机由后端业务动作驱动）。
 */
export const purchaseRequestService = {
  /** 预取下一个申请编号（新建表单展示，服务端保存时再次生成兜底）。 */
  async getNextCode(signal?: AbortSignal): Promise<string> {
    return request<string>('/purchase/request/next-code', { signal })
  },

  /** 分页查询采购申请；时间范围筛选匹配提交时间，草稿（无提交时间）不参与。 */
  async getPage(
    params: PurchaseRequestListParams,
    signal?: AbortSignal,
  ): Promise<PaginatedData<PurchaseRequestRecord>> {
    return request<PaginatedData<PurchaseRequestRecord>>('/purchase/request/page', { params, signal })
  },

  /** 新建采购申请（草稿态）；明细不合法返回业务码 4503。 */
  async create(payload: SavePurchaseRequestPayload): Promise<PurchaseRequestRecord> {
    return request<PurchaseRequestRecord>('/purchase/request', { method: 'POST', data: payload })
  },

  /** 编辑申请（仅草稿 / 已拒绝可改）；编码与申请人均不可修改。 */
  async update(id: string, payload: SavePurchaseRequestPayload): Promise<PurchaseRequestRecord> {
    return request<PurchaseRequestRecord>(`/purchase/request/${id}`, { method: 'PUT', data: payload })
  },

  /** 删除草稿（仅草稿可物理删除，其余状态后续用作废代替）。 */
  async remove(id: string): Promise<null> {
    return request<null>(`/purchase/request/${id}`, { method: 'DELETE' })
  },

  /** 提交审批：草稿首次提交 / 已拒绝修改后重提，均进入待审批。 */
  async submit(id: string): Promise<PurchaseRequestRecord> {
    return request<PurchaseRequestRecord>(`/purchase/request/${id}/submit`, { method: 'POST' })
  },

  /** 撤回申请：待审批 → 草稿，清空提交时间并留审批流水。 */
  async withdraw(id: string): Promise<PurchaseRequestRecord> {
    return request<PurchaseRequestRecord>(`/purchase/request/${id}/withdraw`, { method: 'POST' })
  },

  /** 申请详情（含审批流水时间线）。 */
  async getDetail(id: string, signal?: AbortSignal): Promise<PurchaseRequestDetail> {
    return request<PurchaseRequestDetail>(`/purchase/request/${id}`, { signal })
  },
}
