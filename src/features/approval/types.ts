/**
 * 审批中心（approval）领域类型定义。
 *
 * 审批记录是跨单据的公共实体：采购申请（已实现）、后续的采购订单等
 * 单据都通过 businessType + businessId 关联审批流水。
 * MVP 为单级审批：凡持有「审批人」角色的用户均可审批全部待审批申请，先到先审。
 */

/** 审批流水的动作类型。动作名展示映射见 APPROVAL_ACTION_NAMES。 */
export type ApprovalAction = 'create' | 'submit' | 'resubmit' | 'withdraw' | 'approve' | 'reject'

/** 动作 → 时间线展示名（详情页审批记录、后续审批中心列表共用）。 */
export const APPROVAL_ACTION_NAMES: Record<ApprovalAction, string> = {
  create: '创建草稿',
  submit: '提交审批',
  resubmit: '修改后重提',
  withdraw: '撤回申请',
  approve: '审批通过',
  reject: '审批拒绝',
}

/** 单据审批流水。创建/提交/撤回由业务模块写入；通过/拒绝由审批中心写入。 */
export interface ApprovalRecord {
  id: string
  /** 业务单据类型，与后端 business_type 对应；MVP 仅采购申请。 */
  businessType: 'purchase_request'
  /** 业务单据 id。 */
  businessId: string
  action: ApprovalAction
  operatorId: string
  operatorName: string
  /** 操作人部门（时间线辅助展示）。 */
  department?: string
  /** 审批意见（仅 approve / reject 常见；其他动作可空）。 */
  comment?: string
  /** 操作时间（YYYY-MM-DD HH:mm:ss）。 */
  createdAt: string
}

/** 审批结论动作（流水 action 的子集）：单级审批的最终裁决。 */
export type ApprovalConclusion = Extract<ApprovalAction, 'approve' | 'reject'>

/** 结论 → 列表结果标签（我已审批结果列与需求「通过绿 / 拒绝红」口径一致）。 */
export const APPROVAL_CONCLUSION_META: Record<ApprovalConclusion, { label: string; color: string }> = {
  approve: { label: '已通过', color: 'success' },
  reject: { label: '已拒绝', color: 'error' },
}

/** 待审批任务（MVP 仅采购申请）：审批中心列表行的展示投影，字段对齐需求字段清单。 */
export interface ApprovalTask {
  /** 业务单据 id（进入审批详情用）。 */
  id: string
  /** 申请编号。 */
  code: string
  /** 申请主题。 */
  title: string
  applicantId: string
  applicantName: string
  /** 申请人部门（档案快照）。 */
  department: string
  /** 预计总金额（元）。 */
  totalAmount: number
  /** 提交时间；待办按其升序展示（先到先审）。 */
  submittedAt: string
}

/** 待审批列表查询参数（状态固定为 pending，不下放给前端）。 */
export interface ApprovalTaskListParams {
  /** 关键字，模糊匹配申请编号 / 主题。 */
  keyword?: string
  /** 按申请人精确匹配（用户 id）。 */
  applicantId?: string
  /** 提交时间范围（YYYY-MM-DD，含边界）。 */
  submittedFrom?: string
  submittedTo?: string
  current: number
  pageSize: number
}

/** 我已审批记录行：结论流水 join 申请单据后的展示投影。 */
export interface ApprovalProcessedRecord {
  /** 审批流水 id。 */
  id: string
  /** 业务单据 id（进入只读详情用）。 */
  businessId: string
  /** 申请编号。 */
  code: string
  title: string
  applicantName: string
  /** 申请人部门。 */
  department: string
  /** 预计总金额（元）。 */
  totalAmount: number
  /** 我的结论。 */
  action: ApprovalConclusion
  /** 我的审批意见（通过可选、拒绝必填）。 */
  comment?: string
  /** 结论时间。 */
  createdAt: string
}

/** 我已审批列表查询参数。 */
export interface ApprovalProcessedListParams {
  keyword?: string
  /** 按结论过滤。 */
  action?: ApprovalConclusion
  /** 结论时间范围（YYYY-MM-DD，含边界）。 */
  processedFrom?: string
  processedTo?: string
  current: number
  pageSize: number
}

/** 审批裁决载荷：通过意见选填；拒绝意见由服务端强制校验必填。 */
export interface ApprovalDecisionPayload {
  comment?: string
}
