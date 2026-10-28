import { useMutation, useQueryClient } from '@tanstack/react-query'
import { receivingService } from '../services/receivingService'
import { receivingQueryKeys } from './useReceivingQueries'
import type { ConfirmReceiptPayload, SubmitInspectionPayload } from '../types'
import { purchaseOrderQueryKeys } from '@/features/purchase/hooks/usePurchaseOrders'

/**
 * 收货与验收写动作：
 * - 确认收货 / 提交验收都会整体失效本域查询（单据列表、详情与关联单据联查）；
 * - 两个动作都推进采购订单状态（shipped → received → inspected），
 *   因此同时失效采购订单域查询，订单列表 / 详情状态即时刷新。
 */

export function useReceivingMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: receivingQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.all })
  }

  /** 确认收货：登记实收数量，生成待验收单，订单 → 已收货。 */
  const confirmReceipt = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ConfirmReceiptPayload }) =>
      receivingService.confirmReceipt(id, payload),
    onSuccess: invalidate,
  })

  /** 提交验收：落合格 / 不合格结论，订单 → 已验收。 */
  const submitInspection = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SubmitInspectionPayload }) =>
      receivingService.submitInspection(id, payload),
    onSuccess: invalidate,
  })

  return { confirmReceipt, submitInspection }
}
