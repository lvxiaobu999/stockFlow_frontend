/**
 * 收货与验收（receiving）领域类型定义。
 *
 * 覆盖「收货单（receipt）」与「验收单（inspection）」两个子域
 * （详见需求文档《10-收货与验收/数据库设计》）。单据由上游发货单**预建**：
 * 供应商发货即生成「待收货」收货单，仓库确认收货即生成「待验收」验收单，
 * 单据一经提交不可修改（冲正 / 退货归第二阶段）。
 * 状态机一律由服务端业务动作驱动：确认收货（pending → received，订单 → 已收货）、
 * 提交验收（pending → qualified / partial / unqualified，订单 → 已验收）。
 */

/** 收货单状态：待收货（发货单到仓未登记）→ 已收货（实收数量已登记）。 */
export type ReceiptStatus = 'pending' | 'received'

/** 状态 → 展示名 / 标签色（需求风格：待收货橙、已收货蓝）。 */
export const RECEIPT_STATUS_META: Record<ReceiptStatus, { label: string; color: string }> = {
  pending: { label: '待收货', color: 'warning' },
  received: { label: '已收货', color: 'blue' },
}

/**
 * 验收结论：待验收 → 全部合格 / 部分合格 / 全部不合格。
 * 不合格数量 MVP 仅记录不入库（退货 / 冲正归第二阶段）。
 */
export type InspectionResult = 'pending' | 'qualified' | 'partial' | 'unqualified'

/** 结论 → 展示名 / 标签色（需求风格：待验收橙、合格绿、不合格红；部分合格取蓝）。 */
export const INSPECTION_RESULT_META: Record<InspectionResult, { label: string; color: string }> = {
  pending: { label: '待验收', color: 'warning' },
  qualified: { label: '全部合格', color: 'success' },
  partial: { label: '部分合格', color: 'processing' },
  unqualified: { label: '全部不合格', color: 'error' },
}

/** 验收单列表的结果筛选值：三种结论可合并为「已验收」（settled）一个页签。 */
export type InspectionResultFilter = InspectionResult | 'settled'

/** 收货单明细行。数量口径：应发 = 发货单实发（MVP 一次发清即订购数）。 */
export interface ReceiptItem {
  id: string
  productId: string
  productCode: string
  productName: string
  /** 规格型号快照（随发货单明细透传）。 */
  spec: string
  unit: string
  /** 应发数量（发货单实发数量快照）。 */
  expectedQty: number
  /** 实收数量；待收货单未登记时为 0，确认收货后 1 ~ 应发数量（支持少收）。 */
  receivedQty: number
  remark?: string
}

/**
 * 收货单（receipt）：供应商发货后预建，仓库确认收货时登记实收数量。
 * 关联发货单（shipment）可追溯到物流信息；确认收货后预建对应验收单并回写投影。
 */
export interface ReceiptRecord {
  id: string
  /** 收货单号（业务唯一）：RC + 单据日期 + 4 位流水。 */
  code: string
  orderId: string
  orderCode: string
  /** 关联发货单（可追溯物流；发货即预建，恒存在）。 */
  shipmentId: string
  shipmentCode: string
  /** 冗余供应商字段，便于筛选（与数据库设计一致）。 */
  supplierId: string
  supplierName: string
  status: ReceiptStatus
  items: ReceiptItem[]
  /** 收货备注（破损、少件等），确认收货时填写。 */
  remark?: string
  /** 收货人（仓库操作账号展示名）；待收货为空。 */
  receivedByName?: string
  /** 确认收货时间；待收货为空。 */
  receivedAt?: string
  /** 关联验收单投影：确认收货时预建验收单后回写（待收货单为空）。 */
  inspectionId?: string
  inspectionCode?: string
  /** 关联验收单当前结论投影，列表「去验收」按钮据此收敛（未建验收单为空）。 */
  inspectionResult?: InspectionResult
  /** 单据创建时间 = 发货单生成时间（预建时点）。 */
  createdAt: string
  updatedAt: string
}

/** 验收单明细行。orderedQty 为订单数量投影（数据库不落库，供「应收 vs 实收」对照）。 */
export interface InspectionItem {
  id: string
  productId: string
  productCode: string
  productName: string
  /** 规格型号快照。 */
  spec: string
  unit: string
  /** 订单数量（投影字段，不落库）。 */
  orderedQty: number
  /** 实收数量（取自收货单）。 */
  receivedQty: number
  /** 合格数量（进入库存的口径，≤ 实收）。 */
  qualifiedQty: number
  /** 不合格数量（仅记录不入库）；实收 = 合格 + 不合格。 */
  unqualifiedQty: number
  remark?: string
}

/**
 * 验收单（inspection）：收货确认后预建，仓库提交合格 / 不合格数量后落结论。
 * 全部合格 / 部分合格 / 全部不合格由服务端按明细汇总判定。
 */
export interface InspectionRecord {
  id: string
  /** 验收单号（业务唯一）：IS + 单据日期 + 4 位流水。 */
  code: string
  orderId: string
  orderCode: string
  receiptId: string
  receiptCode: string
  supplierId: string
  supplierName: string
  result: InspectionResult
  items: InspectionItem[]
  /** 验收备注（不合格处理说明等），提交时填写。 */
  remark?: string
  /** 验收人（仓库操作账号展示名）；待验收为空。 */
  inspectedByName?: string
  /** 验收提交时间；待验收为空。 */
  inspectedAt?: string
  /** 单据创建时间 = 收货确认时间（预建时点）。 */
  createdAt: string
  updatedAt: string
}

/** 收货单列表查询参数：关键字（收货单号 / 关联订单号）+ 状态 + 供应商 + 单据时间范围。 */
export interface ReceiptListParams {
  keyword?: string
  status?: ReceiptStatus
  supplierId?: string
  /** 按关联订单精确匹配（采购订单详情「关联单据」联查用）。 */
  orderId?: string
  createdFrom?: string
  createdTo?: string
  current: number
  pageSize: number
}

/** 验收单列表查询参数：关键字（验收单号 / 收货单号 / 订单号）+ 结论 + 供应商 + 时间范围。 */
export interface InspectionListParams {
  keyword?: string
  /** 结果筛选；settled 为三种已验收结论的合并口径（列表页签「已验收」）。 */
  result?: InspectionResultFilter
  supplierId?: string
  orderId?: string
  createdFrom?: string
  createdTo?: string
  current: number
  pageSize: number
}

/** 确认收货明细载荷：按商品登记实收数量（1 ~ 应发，MVP 一次收清不允许超收）。 */
export interface ConfirmReceiptItemPayload {
  productId: string
  receivedQty: number
}

/** 确认收货载荷：明细必须覆盖收货单全部商品，备注选填（破损 / 少件说明）。 */
export interface ConfirmReceiptPayload {
  items: ConfirmReceiptItemPayload[]
  remark?: string
}

/** 提交验分明细载荷：合格 + 不合格 = 实收（服务端强校验）。 */
export interface SubmitInspectionItemPayload {
  productId: string
  qualifiedQty: number
  unqualifiedQty: number
}

/** 提交验收载荷：结论由服务端按明细汇总判定，前端不传 result。 */
export interface SubmitInspectionPayload {
  items: SubmitInspectionItemPayload[]
  remark?: string
}

/** 采购订单的关联单据联查结果：收货单与验收单可能尚未生成（null）。 */
export interface OrderReceivingDocuments {
  receipt: ReceiptRecord | null
  inspection: InspectionRecord | null
}
