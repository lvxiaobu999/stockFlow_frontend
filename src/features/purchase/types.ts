/**
 * 采购管理（purchase）领域类型定义。
 *
 * 覆盖「采购申请」与「采购订单」两个子域（详见需求文档《03-采购管理/数据库设计》）；
 * 字段与后端表结构对齐，原型的申请主题 / 期望到货日期 / 提交时间为扩表字段
 * （数据库设计未包含，偏差已记录在 docs/接口与 Mock 说明.md）。
 */
import type { ApprovalRecord } from '@/features/approval/types'
import type { ProductUnit } from '@/features/product/types'

/**
 * 采购申请状态机（draft → pending → approved / rejected → ordered）：
 * - 草稿可编辑、提交、删除；待审批可撤回（回草稿）；
 * - 已拒绝可修改后重新提交（回待审批）；已通过可生成采购订单；
 * - 状态一律由后端业务动作触发变更，前端不可直接改 status。
 */
export type PurchaseRequestStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'ordered'

/** 状态 → 展示名 / 标签色（列表页签、表格状态列与详情头共用）。 */
export const PURCHASE_REQUEST_STATUS_META: Record<PurchaseRequestStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  pending: { label: '待审批', color: 'warning' },
  approved: { label: '已通过', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
  ordered: { label: '已生成订单', color: 'processing' },
}

/** 采购申请明细行。商品档案字段为提交时由服务端快照，避免商品改名影响历史单据。 */
export interface PurchaseRequestItem {
  id: string
  productId: string
  productCode: string
  productName: string
  /** 规格型号快照。 */
  spec: string
  unit: ProductUnit
  /** 采购数量（正整数）。 */
  quantity: number
  /** 参考单价（元），默认取商品采购参考价，申请人可调整。 */
  referencePrice: number
  /** 行金额（元）= quantity × referencePrice，服务端计算、前端只读展示。 */
  amount: number
  remark?: string
}

/** 采购申请主记录。列表行内联 items（MVP 简化，订单模块落地时改为条数投影）。 */
export interface PurchaseRequestRecord {
  id: string
  /** 申请编号（PR + 日期 + 4 位流水），服务端生成、创建后不可修改。 */
  code: string
  /** 申请主题（原型扩表字段，数据库无 title 列）。 */
  title: string
  applicantId: string
  applicantName: string
  /** 申请部门（申请人档案快照）。 */
  department: string
  /** 期望到货日期（YYYY-MM-DD，选填；原型扩表字段）。 */
  expectedDate?: string
  /** 采购原因（审批人可见）。 */
  reason: string
  /** 预计总金额（元）= Σ 行金额，服务端计算。 */
  totalAmount: number
  status: PurchaseRequestStatus
  items: PurchaseRequestItem[]
  /** 最近一次提交 / 重提时间；草稿态（含撤回后）为空。 */
  submittedAt?: string
  /** 已生成订单的订单 id 投影（与采购订单数据集的派生规则一致：按 ordered 申请顺序 po-001 递增）。 */
  orderedOrderId?: string
  /** 已生成订单的订单编码投影。 */
  orderedOrderCode?: string
  createdAt: string
  updatedAt: string
}

/** 申请详情：主记录 + 审批流水时间线。 */
export interface PurchaseRequestDetail extends PurchaseRequestRecord {
  approvalRecords: ApprovalRecord[]
}

/** 采购申请列表查询参数。 */
export interface PurchaseRequestListParams {
  /** 关键字，模糊匹配申请编号 / 主题。 */
  keyword?: string
  status?: PurchaseRequestStatus
  /** 按申请人精确匹配（用户 id）。 */
  applicantId?: string
  /** 提交时间范围（YYYY-MM-DD，含边界）；草稿无提交时间，设置范围后不参与匹配。 */
  submittedFrom?: string
  submittedTo?: string
  current: number
  pageSize: number
}

/** 明细行载荷：商品档案字段由服务端按 productId 快照，不开放给表单。 */
export interface PurchaseRequestItemPayload {
  productId: string
  quantity: number
  referencePrice: number
  remark?: string
}

/** 新建 / 编辑采购申请载荷：申请人与编号由服务端确定（申请人 = 当前登录用户）。 */
export interface SavePurchaseRequestPayload {
  title: string
  expectedDate?: string
  reason: string
  items: PurchaseRequestItemPayload[]
}

/**
 * 采购订单状态机（draft → pending_supplier → confirmed → shipped → received
 * → inspected → completed；pending_supplier 可被供应商拒绝 → rejected，可重发或作废）：
 * - 状态一律由后端业务动作触发变更，前端不可直接改 status；
 * - cancelled（已作废）为终态，是需求「供应商拒绝后可作废」的扩表状态
 *   （数据库设计未包含，偏差已记录在 docs/接口与 Mock 说明.md）；
 * - 供应商确认 / 拒绝 / 发货动作属供应商端模块，本模块只读展示。
 */
export type PurchaseOrderStatus =
  | 'draft'
  | 'pending_supplier'
  | 'confirmed'
  | 'shipped'
  | 'received'
  | 'inspected'
  | 'completed'
  | 'rejected'
  | 'cancelled'

/** 状态 → 展示名 / 标签色（列表页签、表格状态列与详情头共用）。 */
export const PURCHASE_ORDER_STATUS_META: Record<PurchaseOrderStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  pending_supplier: { label: '待供应商确认', color: 'processing' },
  confirmed: { label: '已确认', color: 'cyan' },
  shipped: { label: '已发货', color: 'blue' },
  received: { label: '已收货', color: 'geekblue' },
  inspected: { label: '已验收', color: 'purple' },
  completed: { label: '已完成', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
  cancelled: { label: '已作废', color: 'default' },
}

/** 采购订单明细行。商品档案字段为保存时由服务端快照，与申请明细同口径。 */
export interface PurchaseOrderItem {
  id: string
  productId: string
  productCode: string
  productName: string
  /** 规格型号快照。 */
  spec: string
  unit: ProductUnit
  /** 采购数量（正整数）。 */
  quantity: number
  /** 成交单价（元），从申请生成时默认取申请参考价，采购员可确认调整。 */
  unitPrice: number
  /** 行金额（元）= quantity × unitPrice，服务端计算、前端只读展示。 */
  amount: number
  remark?: string
}

/** 采购订单主记录。 */
export interface PurchaseOrderRecord {
  id: string
  /** 订单编号（PO + 创建日期 + 4 位流水），服务端生成、创建后不可修改。 */
  code: string
  /** 来源申请 id（数据库允许为空，用于线下订单补录；MVP 一单一申请）。 */
  requestId?: string
  /** 来源申请编码投影，便于列表 / 详情直达溯源。 */
  requestCode?: string
  supplierId: string
  /** 供应商名称快照，避免供应商改名影响历史单据。 */
  supplierName: string
  /** 采购员（创建人），取当前登录用户。 */
  purchaserId: string
  purchaserName: string
  /** 订单金额（元）= Σ 行金额，服务端计算。 */
  totalAmount: number
  /** 期望交货日期（YYYY-MM-DD，选填）。 */
  expectedDate?: string
  remark?: string
  status: PurchaseOrderStatus
  items: PurchaseOrderItem[]
  /** 发送给供应商时间（draft → pending_supplier 时写入，重发覆盖）。 */
  sentAt?: string
  /** 供应商确认时间。 */
  confirmedAt?: string
  /** 供应商确认时填写的预计发货时间（YYYY-MM-DD，门户扩展字段）。 */
  promisedShipDate?: string
  /** 供应商拒绝时间与原因（rejected 时成对出现）。 */
  rejectedAt?: string
  rejectReason?: string
  shippedAt?: string
  receivedAt?: string
  inspectedAt?: string
  completedAt?: string
  /** 作废时间与原因（cancelled 时成对出现）。 */
  cancelledAt?: string
  cancelReason?: string
  createdAt: string
  updatedAt: string
}

/** 采购订单列表查询参数。 */
export interface PurchaseOrderListParams {
  /** 关键字，模糊匹配订单编号 / 来源申请编码。 */
  keyword?: string
  status?: PurchaseOrderStatus
  /** 按供应商精确匹配（供应商 id）。 */
  supplierId?: string
  /** 创建时间范围（YYYY-MM-DD，含边界）。 */
  createdFrom?: string
  createdTo?: string
  current: number
  pageSize: number
}

/** 订单明细行载荷：商品档案字段由服务端按 productId 快照，不开放给表单。 */
export interface PurchaseOrderItemPayload {
  productId: string
  quantity: number
  unitPrice: number
  remark?: string
}

/**
 * 新建 / 编辑采购订单载荷：编号与采购员由服务端确定。
 * 携带 requestId 即「从申请生成」，服务端会把申请置为已生成订单；
 * 省略则为线下订单补录（申请侧不受影响）。
 */
export interface SavePurchaseOrderPayload {
  requestId?: string
  supplierId: string
  expectedDate?: string
  remark?: string
  items: PurchaseOrderItemPayload[]
}
