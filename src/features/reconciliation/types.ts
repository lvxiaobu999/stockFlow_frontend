/**
 * 对账管理（reconciliation）领域类型定义。
 *
 * 覆盖「对账单」与「待对账单据池」两个子域（详见需求文档《06-对账管理/数据库设计》）。
 * 对账单按「供应商 + 对账期间」把已收货的采购单据汇总成账：明细行 = 收货单 × 商品
 * （应付金额按实收数量 × 订单成交价计算），状态机由服务端业务动作驱动，前端不可直接改
 * status。已付金额为演示种子（付款管理模块落地后改为 payment 记录推导，偏差已记录）。
 */

/**
 * 对账单状态机（draft → pending → confirmed / disputed → closed）：
 * - 草稿：创建 / 编辑明细勾选，可提交；
 * - 待确认：提交后等待财务核对；
 * - 已确认：核对无误，可进入付款（关联付款为付款模块二期入口）；
 * - 有差异：标记差异后进入，处理后再确认（可重复标记更新差异信息）；
 * - 已关闭：确认后手动 / 关联付款完成关闭，终态。
 */
export type ReconciliationStatus = 'draft' | 'pending' | 'confirmed' | 'disputed' | 'closed'

/** 状态 → 展示名 / 标签色（需求风格：草稿蓝、待确认橙、已确认绿、有差异红、已关闭灰）。 */
export const RECONCILIATION_STATUS_META: Record<ReconciliationStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'processing' },
  pending: { label: '待确认', color: 'warning' },
  confirmed: { label: '已确认', color: 'success' },
  disputed: { label: '有差异', color: 'error' },
  closed: { label: '已关闭', color: 'default' },
}

/** 差异类型字典：标记差异时选择，便于差异原因归类统计。 */
export type ReconciliationDiffType = 'quantity' | 'price' | 'amount' | 'other'

/** 差异类型 → 展示名。 */
export const RECONCILIATION_DIFF_TYPE_META: Record<ReconciliationDiffType, string> = {
  quantity: '数量差异',
  price: '价格差异',
  amount: '金额差异',
  other: '其他差异',
}

/** 对账单明细行：收货单 × 商品粒度（金额口径 = 实收数量 × 订单成交价快照）。 */
export interface ReconciliationItem {
  id: string
  /** 关联采购订单（可溯源）。 */
  orderId: string
  orderCode: string
  /** 关联收货单（可溯源）。 */
  receiptId: string
  receiptCode: string
  productId: string
  productCode: string
  productName: string
  /** 规格型号快照。 */
  spec: string
  unit: string
  /** 采购数量（订单数量投影，供「订单 vs 实收」对照）。 */
  orderedQty: number
  /** 实收数量（取自收货单，应付金额的计算口径）。 */
  receivedQty: number
  /** 成交单价（元，订单明细快照）。 */
  unitPrice: number
  /** 本次对账金额（元）= receivedQty × unitPrice，服务端计算。 */
  amount: number
  /** 已付金额（元，演示种子按订单已付顺序分摊；付款模块落地后改为实际关联）。 */
  paidAmount: number
  /** 收货日期（YYYY-MM-DD，取自收货单确认时间）。 */
  receivedAt: string
  remark?: string
}

/**
 * 对账单主记录。金额五件套由服务端按明细推导：
 * 订单金额 = Σ(采购数量 × 单价)、应付 = Σ(实收 × 单价)、
 * 待付 = 应付 − 已付、差异金额 = 人工标记（MVP 一次发清口径下无自动短收差异）。
 */
export interface ReconciliationRecord {
  id: string
  /** 对账单号（业务唯一）：RE + 单据日期 + 4 位流水（原型 RC 前缀与收货单冲突，偏差已记录）。 */
  code: string
  supplierId: string
  /** 供应商名称快照。 */
  supplierName: string
  /** 对账期间起（YYYY-MM-DD）。 */
  periodStart: string
  /** 对账期间止（YYYY-MM-DD）。 */
  periodEnd: string
  /** 订单金额合计（元）。 */
  orderAmount: number
  /** 应付金额（元，实收口径）。 */
  payableAmount: number
  /** 已付金额（元）。 */
  paidAmount: number
  /** 待付金额（元）= payableAmount − paidAmount。 */
  unpaidAmount: number
  /** 差异金额（元，标记差异时填写；未标记为空）。 */
  diffAmount?: number
  diffType?: ReconciliationDiffType
  /** 差异说明（标记差异时填写，处理差异的依据）。 */
  diffReason?: string
  status: ReconciliationStatus
  items: ReconciliationItem[]
  /** 创建人展示名（财务创建 / 采购员协助发起）。 */
  createdByName: string
  /** 对账备注（如「9 月上半月对账」）。 */
  remark?: string
  /** 确认人展示名与确认时间（confirmed 时成对出现）。 */
  confirmedByName?: string
  confirmedAt?: string
  /** 关闭人展示名、关闭时间与关闭说明（closed 时出现）。 */
  closedByName?: string
  closedAt?: string
  closedRemark?: string
  createdAt: string
  updatedAt: string
}

/** 待对账单据池行：已收货且尚未纳入任何对账单的收货单（整单对账口径）。 */
export interface ReconciliationPoolRecord {
  /** 收货单 id（发起对账的勾选单元）。 */
  receiptId: string
  receiptCode: string
  orderId: string
  orderCode: string
  supplierId: string
  supplierName: string
  /** 商品摘要：单商品直显名称，多商品「X 等 N 项」。 */
  productSummary: string
  /** 明细商品种数。 */
  itemCount: number
  /** 实收数量合计（Σ 收货明细实收）。 */
  receivedQty: number
  /** 应付金额（元，Σ 实收 × 订单成交价）。 */
  payableAmount: number
  /** 已付金额（元，订单维度演示种子）。 */
  paidAmount: number
  /** 收货日期（YYYY-MM-DD）。 */
  receivedAt: string
}

/** 对账单列表查询参数。 */
export interface ReconciliationListParams {
  /** 按供应商精确匹配（供应商 id）。 */
  supplierId?: string
  status?: ReconciliationStatus
  /** 关键字，模糊匹配对账单号 / 供应商名称。 */
  keyword?: string
  /** 对账期间范围（YYYY-MM-DD，与单据期间有交集即命中）。 */
  periodFrom?: string
  periodTo?: string
  current: number
  pageSize: number
}

/** 待对账单据池查询参数（按收货日期筛选）。 */
export interface ReconciliationPoolParams {
  supplierId?: string
  /** 关键字，模糊匹配订单号 / 收货单号 / 商品名称。 */
  keyword?: string
  receivedFrom?: string
  receivedTo?: string
  current: number
  pageSize: number
}

/** 创建对账单载荷：编号 / 创建人 / 金额由服务端生成，submit 决定是否直接提交。 */
export interface CreateReconciliationPayload {
  supplierId: string
  periodStart: string
  periodEnd: string
  /** 纳入本次对账的收货单 id 列表（必须为同一供应商的已收货单且未被对账）。 */
  receiptIds: string[]
  remark?: string
  /** true = 生成对账单并提交（待确认）；缺省保存为草稿。 */
  submit?: boolean
}

/** 编辑草稿载荷：仅草稿可改，明细整单替换（MVP 不做部分行对账）。 */
export interface UpdateReconciliationPayload {
  id: string
  periodStart: string
  periodEnd: string
  receiptIds: string[]
  remark?: string
  /** true = 保存并提交（待确认）。 */
  submit?: boolean
}

/** 提交载荷：草稿 → 待确认。 */
export interface SubmitReconciliationPayload {
  id: string
}

/** 确认通过载荷：待确认 / 有差异 → 已确认；确认意见选填（追溯用）。 */
export interface ConfirmReconciliationPayload {
  id: string
  opinion?: string
}

/** 标记差异载荷：待确认 / 有差异 → 有差异；差异说明必填（服务端校验）。 */
export interface MarkDiffReconciliationPayload {
  id: string
  diffType: ReconciliationDiffType
  /** 差异金额（元，选填；填写后列表差异列展示）。 */
  diffAmount?: number
  reason: string
}

/** 关闭载荷：已确认 → 已关闭（关联付款完成或手动关闭）。 */
export interface CloseReconciliationPayload {
  id: string
  /** 关闭说明（如关联付款单号 / 手动关闭原因）。 */
  remark?: string
}

/** 对账汇总看板：顶部四卡 + 近期待处理列表（同一接口一次取齐）。 */
export interface ReconciliationSummary {
  /** 待对账金额（元）= 单据池应付合计。 */
  poolAmount: number
  /** 待纳入对账笔数（单据池行数）。 */
  poolCount: number
  /** 本月已对账金额（元）= 本月确认（含已关闭）对账单应付合计。 */
  monthConfirmedAmount: number
  /** 本月已确认笔数。 */
  monthConfirmedCount: number
  /** 待确认笔数。 */
  pendingConfirmCount: number
  /** 有差异笔数。 */
  disputedCount: number
  /** 近期待处理对账单（待确认 + 有差异，按创建时间倒序，最多 5 条）。 */
  recentList: ReconciliationRecord[]
}
