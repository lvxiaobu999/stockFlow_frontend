import { useMutation, useQueryClient } from '@tanstack/react-query'
import { approvalQueryKeys } from '@/features/approval/hooks/useApprovals'
import { purchaseRequestQueryKeys } from '@/features/purchase/hooks/usePurchaseRequests'
import { approvalService } from '@/features/approval/services/approvalService'
import type { ApprovalDecisionPayload } from '@/features/approval/types'

/**
 * 审批裁决 mutation 集合：通过 / 拒绝。
 *
 * 裁决同时影响两侧数据：审批中心（待办 / 已办 / 徽标计数）与
 * 采购申请（状态页签 / 详情时间线），成功后统一失效两域查询。
 */
export function useApprovalMutations() {
  const queryClient = useQueryClient()
  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: approvalQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: purchaseRequestQueryKeys.all })
  }

  const approve = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApprovalDecisionPayload }) =>
      approvalService.approve(id, payload),
    onSuccess: invalidateRelated,
  })
  const reject = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApprovalDecisionPayload }) =>
      approvalService.reject(id, payload),
    onSuccess: invalidateRelated,
  })

  return { approve, reject }
}
