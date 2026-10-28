import { useMutation, useQueryClient } from '@tanstack/react-query'
import { purchaseOrderService } from '@/features/purchase/services/purchaseOrderService'
import { purchaseRequestQueryKeys } from '@/features/purchase/hooks/usePurchaseRequests'
import { purchaseOrderQueryKeys } from '@/features/purchase/hooks/usePurchaseOrders'
import type { SavePurchaseOrderPayload } from '@/features/purchase/types'

/**
 * 采购订单写动作 mutation 集合：保存（新建/编辑）、删除草稿、发送供应商、作废。
 *
 * 全部动作都影响状态机；「从申请生成 / 删除草稿 / 作废」还会联动申请侧状态
 * （置为已生成订单或回退已通过），因此成功后同时失效订单域与申请域查询。
 */
export function usePurchaseOrderMutations() {
  const queryClient = useQueryClient()
  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: purchaseRequestQueryKeys.all })
  }

  const create = useMutation({
    mutationFn: (payload: SavePurchaseOrderPayload) => purchaseOrderService.create(payload),
    onSuccess: invalidateRelated,
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SavePurchaseOrderPayload }) =>
      purchaseOrderService.update(id, payload),
    onSuccess: invalidateRelated,
  })
  const remove = useMutation({
    mutationFn: (id: string) => purchaseOrderService.remove(id),
    onSuccess: invalidateRelated,
  })
  const send = useMutation({
    mutationFn: (id: string) => purchaseOrderService.send(id),
    onSuccess: invalidateRelated,
  })
  const voidOrder = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => purchaseOrderService.voidOrder(id, reason),
    onSuccess: invalidateRelated,
  })

  return { create, update, remove, send, voidOrder }
}
