import type {
  ConfirmReceiptPayload,
  InspectionListParams,
  InspectionRecord,
  OrderReceivingDocuments,
  ReceiptListParams,
  ReceiptRecord,
  SubmitInspectionPayload,
} from '../types'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/**
 * 收货与验收服务：单据由上游预建（发货 → 待收货单、收货 → 待验收单），
 * 这里只承载两个业务动作——确认收货（登记实收数量，订单 → 已收货）与
 * 提交验收（落合格 / 不合格结论，订单 → 已验收）。单据提交后不可修改。
 */
export const receivingService = {
  /** 分页查询收货单；keyword 匹配收货单号 / 关联订单号。 */
  async getReceiptPage(params: ReceiptListParams, signal?: AbortSignal): Promise<PaginatedData<ReceiptRecord>> {
    return request<PaginatedData<ReceiptRecord>>('/receiving/receipt/page', { params, signal })
  },

  /** 收货单详情（含明细与验收单投影）。 */
  async getReceiptDetail(id: string, signal?: AbortSignal): Promise<ReceiptRecord> {
    return request<ReceiptRecord>(`/receiving/receipt/${id}`, { signal })
  },

  /**
   * 确认收货：登记实收数量（1 ~ 应发，允许少收），生成待验收单并推进订单为已收货。
   * 已收货单重复提交返回业务码 4802，明细不合法返回 4803。
   */
  async confirmReceipt(id: string, payload: ConfirmReceiptPayload): Promise<ReceiptRecord> {
    return request<ReceiptRecord>(`/receiving/receipt/${id}/confirm`, { method: 'POST', data: payload })
  },

  /** 分页查询验收单；keyword 匹配验收单号 / 收货单号 / 订单号，result 支持 settled 合并口径。 */
  async getInspectionPage(
    params: InspectionListParams,
    signal?: AbortSignal,
  ): Promise<PaginatedData<InspectionRecord>> {
    return request<PaginatedData<InspectionRecord>>('/receiving/inspection/page', { params, signal })
  },

  /** 验收单详情（含应收 / 实收 / 合格 / 不合格明细）。 */
  async getInspectionDetail(id: string, signal?: AbortSignal): Promise<InspectionRecord> {
    return request<InspectionRecord>(`/receiving/inspection/${id}`, { signal })
  },

  /**
   * 提交验收：合格 + 不合格须等于实收，结论由服务端按明细汇总判定
   * （全部合格 / 部分合格 / 全部不合格），推进订单为已验收。
   * 已提交单据重复操作返回 4802，明细不合法返回 4804。
   */
  async submitInspection(id: string, payload: SubmitInspectionPayload): Promise<InspectionRecord> {
    return request<InspectionRecord>(`/receiving/inspection/${id}/submit`, { method: 'POST', data: payload })
  },

  /** 按订单联查关联单据（采购订单详情「关联单据」用），未生成时对应字段为 null。 */
  async getOrderDocuments(orderId: string, signal?: AbortSignal): Promise<OrderReceivingDocuments> {
    return request<OrderReceivingDocuments>(`/receiving/order/${orderId}/documents`, { signal })
  },
}
