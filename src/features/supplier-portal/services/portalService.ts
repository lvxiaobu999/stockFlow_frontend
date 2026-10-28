import type {
  ConfirmOrderPayload,
  PortalOrderListParams,
  PortalSummary,
  PurchaseOrderRecord,
  RejectOrderPayload,
  ShipOrderPayload,
  ShipOrderResult,
  ShipmentListParams,
  ShipmentRecord,
} from '../types'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/**
 * 供应商门户服务：所有接口的数据范围由服务端会话决定（供应商档案自动注入），
 * 前端不传 supplierId。订单动作只允许推进供应商侧状态机——
 * 确认（待确认 → 已确认）、拒绝（待确认 → 已拒绝）、发货（已确认 → 已发货）；
 * 订单内容不可编辑，发货即生成发货单并同步订单状态。
 */
export const portalService = {
  /** 首页统计：我的订单数 / 待确认 / 待发货 / 本月发货。 */
  async getSummary(signal?: AbortSignal): Promise<PortalSummary> {
    return request<PortalSummary>('/portal/summary', { signal })
  },

  /** 分页查询我的采购订单；keyword 匹配订单编号，可按状态与下单时间过滤。 */
  async getOrderPage(params: PortalOrderListParams, signal?: AbortSignal): Promise<PaginatedData<PurchaseOrderRecord>> {
    return request<PaginatedData<PurchaseOrderRecord>>('/portal/purchase-order/page', { params, signal })
  },

  /** 订单详情（含商品明细与状态时间戳）。 */
  async getOrderDetail(id: string, signal?: AbortSignal): Promise<PurchaseOrderRecord> {
    return request<PurchaseOrderRecord>(`/portal/purchase-order/${id}`, { signal })
  },

  /**
   * 确认订单（待确认 → 已确认）；可填预计发货时间，回写订单 promisedShipDate。
   * 订单不存在 / 不属于当前供应商返回 4701，状态不允许返回 4702。
   */
  async confirmOrder(id: string, payload: ConfirmOrderPayload): Promise<PurchaseOrderRecord> {
    return request<PurchaseOrderRecord>(`/portal/purchase-order/${id}/confirm`, { method: 'POST', data: payload })
  },

  /** 拒绝订单（待确认 → 已拒绝）；原因必填，采购员可在订单详情查看。 */
  async rejectOrder(id: string, payload: RejectOrderPayload): Promise<PurchaseOrderRecord> {
    return request<PurchaseOrderRecord>(`/portal/purchase-order/${id}/reject`, { method: 'POST', data: payload })
  },

  /**
   * 填写发货（已确认 → 已发货）：生成发货单并同步订单状态。
   * 明细必须覆盖订单全部商品且数量在 1 ~ 订购数之间（4703），否则拒绝。
   */
  async shipOrder(id: string, payload: ShipOrderPayload): Promise<ShipOrderResult> {
    return request<ShipOrderResult>(`/portal/purchase-order/${id}/ship`, { method: 'POST', data: payload })
  },

  /** 分页查询发货记录；keyword 匹配发货单号 / 关联订单号。 */
  async getShipmentPage(params: ShipmentListParams, signal?: AbortSignal): Promise<PaginatedData<ShipmentRecord>> {
    return request<PaginatedData<ShipmentRecord>>('/portal/shipment/page', { params, signal })
  },
}
