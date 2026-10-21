/**
 * 采购管理（purchase）领域类型定义。
 *
 * 本期实现「采购申请」子域（详见需求文档《03-采购管理/数据库设计》）；
 * 字段与后端表结构对齐，原型的申请主题 / 期望到货日期 / 提交时间为扩表字段
 * （数据库设计未包含，偏差已记录在 docs/接口与 Mock 说明.md）。
 * 采购订单（purchase order）类型在订单模块落地时补充。
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
  /** 已生成订单的订单编码投影（订单模块落地前仅演示数据携带）。 */
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
