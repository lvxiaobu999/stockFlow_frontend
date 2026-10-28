import type { PurchaseOrderListParams, PurchaseOrderRecord, SavePurchaseOrderPayload } from '@/features/purchase/types'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/**
 * 采购订单服务：编号服务端生成（PO + 创建日期 + 4 位流水）、创建后不可修改；
 * 状态流转全部走独立动作接口（发送 / 作废），前端不可直接改 status。
 * 供应商确认 / 拒绝 / 发货属供应商端模块；收货 / 验收 / 付款结清属收货与付款模块，
 * 本服务只读承载这些状态（时间戳由对应模块的落地接口写入）。
 */
export const purchaseOrderService = {
  /** 预取下一个订单编号（新建表单展示，服务端保存时再次生成兜底）。 */
  async getNextCode(signal?: AbortSignal): Promise<string> {
    return request<string>('/purchase/order/next-code', { signal })
  },

  /** 分页查询采购订单；keyword 匹配订单编号 / 来源申请编码。 */
  async getPage(params: PurchaseOrderListParams, signal?: AbortSignal): Promise<PaginatedData<PurchaseOrderRecord>> {
    return request<PaginatedData<PurchaseOrderRecord>>('/purchase/order/page', { params, signal })
  },

  /**
   * 新建采购订单（草稿态）。
   * 携带 requestId 时服务端校验申请必须为已通过，并联动置为「已生成订单」；
   * 供应商不存在或停用返回业务码 4604，明细不合法返回 4603。
   */
  async create(payload: SavePurchaseOrderPayload): Promise<PurchaseOrderRecord> {
    return request<PurchaseOrderRecord>('/purchase/order', { method: 'POST', data: payload })
  },

  /** 编辑订单（仅草稿可改）；编号与采购员不可修改，明细整体替换。 */
  async update(id: string, payload: SavePurchaseOrderPayload): Promise<PurchaseOrderRecord> {
    return request<PurchaseOrderRecord>(`/purchase/order/${id}`, { method: 'PUT', data: payload })
  },

  /** 删除草稿（仅草稿可物理删除）；来源申请联动回退为「已通过」。 */
  async remove(id: string): Promise<null> {
    return request<null>(`/purchase/order/${id}`, { method: 'DELETE' })
  },

  /** 发送给供应商：草稿首发 / 已拒绝重发，均进入待供应商确认（写入 sentAt）。 */
  async send(id: string): Promise<PurchaseOrderRecord> {
    return request<PurchaseOrderRecord>(`/purchase/order/${id}/send`, { method: 'POST' })
  },

  /** 作废：待供应商确认 / 已拒绝 → 已作废（终态）；来源申请联动回退为「已通过」。 */
  async voidOrder(id: string, reason: string): Promise<PurchaseOrderRecord> {
    return request<PurchaseOrderRecord>(`/purchase/order/${id}/void`, { method: 'POST', data: { reason } })
  },

  /** 订单详情（含状态时间戳，时间线由前端派生）。 */
  async getDetail(id: string, signal?: AbortSignal): Promise<PurchaseOrderRecord> {
    return request<PurchaseOrderRecord>(`/purchase/order/${id}`, { signal })
  },
}
