import { useMutation, useQueryClient } from '@tanstack/react-query'
import { approvalQueryKeys } from '@/features/approval/hooks/useApprovals'
import { purchaseRequestService } from '@/features/purchase/services/purchaseRequestService'
import { purchaseRequestQueryKeys } from '@/features/purchase/hooks/usePurchaseRequests'
import type { SavePurchaseRequestPayload } from '@/features/purchase/types'

/**
 * 采购申请写动作 mutation 集合：保存（新建/编辑）、删除、提交、撤回。
 *
 * 全部动作都影响状态机与审批流水，成功后统一失效申请的全部查询
 * （分页、详情、编号预取）；提交 / 撤回还会改变审批中心的待办池
 * 与徽标计数，因此一并失效审批域查询。
 */
export function usePurchaseRequestMutations() {
  const queryClient = useQueryClient()
  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: purchaseRequestQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: approvalQueryKeys.all })
  }

  const create = useMutation({
    mutationFn: (payload: SavePurchaseRequestPayload) => purchaseRequestService.create(payload),
    onSuccess: invalidateRelated,
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SavePurchaseRequestPayload }) =>
      purchaseRequestService.update(id, payload),
    onSuccess: invalidateRelated,
  })
  const remove = useMutation({
    mutationFn: (id: string) => purchaseRequestService.remove(id),
    onSuccess: invalidateRelated,
  })
  const submit = useMutation({
    mutationFn: (id: string) => purchaseRequestService.submit(id),
    onSuccess: invalidateRelated,
  })
  const withdraw = useMutation({
    mutationFn: (id: string) => purchaseRequestService.withdraw(id),
    onSuccess: invalidateRelated,
  })

  return { create, update, remove, submit, withdraw }
}
