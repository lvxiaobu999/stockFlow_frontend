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
