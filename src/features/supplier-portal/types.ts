/**
 * 供应商门户（supplier-portal）领域类型定义。
 *
 * 门户没有自己的采购单据：订单实体复用采购域的 PurchaseOrderRecord，
 * 这里只新增「发货单」实体与门户侧的查询 / 动作载荷类型。
 * 状态机由供应商动作驱动推进：确认（pending_supplier → confirmed）、
 * 拒绝（pending_supplier → rejected）、发货（confirmed → shipped）。
 */

// 供应商视角的订单实体与状态字典与采购域完全同源，原样重导出避免两处维护。
// （本文件的部分载荷类型也引用订单实体，因此同时以 import 引入本地作用域。）
import type { PurchaseOrderRecord, PurchaseOrderStatus } from '@/features/purchase/types'
export type {
  PurchaseOrderRecord,
  PurchaseOrderStatus,
  PurchaseOrderItem,
  PurchaseOrderListParams,
} from '@/features/purchase/types'
export { PURCHASE_ORDER_STATUS_META } from '@/features/purchase/types'

/** 门户首页统计卡片：我的订单数 / 待确认 / 待发货 / 本月发货。 */
export interface PortalSummary {
  /** 分配给当前供应商的全部采购订单数（含已完成 / 已作废等终态）。 */
  totalOrders: number
  /** 待供应商确认的订单数（pending_supplier）。 */
  pendingConfirm: number
  /** 已确认待发货的订单数（confirmed）。 */
  toShip: number
  /** 本自然月已发货的发货单数（按 shippedAt 落在当月计）。 */
  monthShipped: number
}

/**
 * 发货单明细：数量快照含「订单数量」投影，便于供应商对照本次实发。
 * 数据库 shipment_item 只存 shipped_qty，orderedQty 由订单明细联查投影。
 */
export interface ShipmentItem {
  id: string
  productId: string
  productCode: string
  productName: string
  spec: string
  unit: string
  /** 订单数量（投影字段，不落库）。 */
  orderedQty: number
  /** 本次实发数量。 */
  shippedQty: number
  remark?: string
}

/**
 * 发货单（shipment）：供应商填写物流信息后生成，是收货模块的上游单据。
 * MVP 一次发清——一张订单至多一张发货单，发货后订单进入已发货状态。
 */
export interface ShipmentRecord {
  id: string
  /** 发货单号（业务唯一）：SH + 发货日期 + 4 位流水。 */
  code: string
  orderId: string
  orderCode: string
  /** 冗余供应商字段，便于按供应商过滤（与数据库设计一致）。 */
  supplierId: string
  supplierName: string
  logisticsCompany?: string
  trackingNo?: string
  /** 发货时间；同时回写到关联订单的 shippedAt。 */
  shippedAt: string
  remark?: string
  items: ShipmentItem[]
  /** 操作人（供应商账号的展示名，即公司名）。 */
  createdByName: string
  createdAt: string
}

/** 门户订单列表查询参数：订单号关键字 + 状态 + 下单时间范围。 */
export interface PortalOrderListParams {
  /** 模糊匹配订单编号。 */
  keyword?: string
  status?: PurchaseOrderStatus
  createdFrom?: string
  createdTo?: string
  current: number
  pageSize: number
}

/** 发货记录列表查询参数：发货单号 / 关联订单号关键字。 */
export interface ShipmentListParams {
  keyword?: string
  current: number
  pageSize: number
}

/** 确认订单载荷：可填写预计发货时间（回写订单的 promisedShipDate）。 */
export interface ConfirmOrderPayload {
  expectedShipDate?: string
}

/** 拒绝订单载荷：原因必填，回写订单的 rejectReason 供采购员查看。 */
export interface RejectOrderPayload {
  reason: string
}

/** 发货明细载荷：按商品维度声明本次实发数量。 */
export interface ShipOrderItemPayload {
  productId: string
  shippedQty: number
}

/** 发货载荷：物流公司 / 单号可选（支持自送），明细必须覆盖订单全部商品。 */
export interface ShipOrderPayload {
  logisticsCompany?: string
  trackingNo?: string
  remark?: string
  items: ShipOrderItemPayload[]
}

/** 发货动作的返回：订单（已置为已发货）与新建的发货单一并回传，供前端双单据提示。 */
export interface ShipOrderResult {
  order: PurchaseOrderRecord
  shipment: ShipmentRecord
}
