import type {
  ApprovalDecisionPayload,
  ApprovalProcessedListParams,
  ApprovalProcessedRecord,
  ApprovalTask,
  ApprovalTaskListParams,
} from '@/features/approval/types'
import type { PurchaseRequestRecord } from '@/features/purchase/types'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/**
 * 审批中心服务：MVP 单级审批，凡持有审批权限的用户共享同一份待办池，
 * 先到先审——裁决接口在单据已非待审批时返回 4502「已被处理」。
 * 裁决动作挂在业务资源路径（/purchase/request/:id/...）下，由审批中心模块调用。
 */
export const approvalService = {
  /** 待办分页：按提交时间升序（先到先审），状态固定为待审批。 */
  async getPendingPage(params: ApprovalTaskListParams, signal?: AbortSignal): Promise<PaginatedData<ApprovalTask>> {
    return request<PaginatedData<ApprovalTask>>('/approval/pending-page', { params, signal })
  },

  /** 我已审批分页：当前登录用户名下的结论流水，按结论时间倒序。 */
  async getProcessedPage(
    params: ApprovalProcessedListParams,
    signal?: AbortSignal,
  ): Promise<PaginatedData<ApprovalProcessedRecord>> {
    return request<PaginatedData<ApprovalProcessedRecord>>('/approval/processed-page', { params, signal })
  },

  /** 待办计数（侧边栏徽标）。 */
  async getPendingCount(signal?: AbortSignal): Promise<number> {
    return request<number>('/approval/pending-count', { signal })
  },

  /** 通过：意见选填；单据已非待审批返回业务码 4502。 */
  async approve(id: string, payload: ApprovalDecisionPayload): Promise<PurchaseRequestRecord> {
    return request<PurchaseRequestRecord>(`/purchase/request/${id}/approve`, { method: 'POST', data: payload })
  },

  /** 拒绝：意见必填（服务端校验），通过后申请人可修改重提。 */
  async reject(id: string, payload: ApprovalDecisionPayload): Promise<PurchaseRequestRecord> {
    return request<PurchaseRequestRecord>(`/purchase/request/${id}/reject`, { method: 'POST', data: payload })
  },
}
