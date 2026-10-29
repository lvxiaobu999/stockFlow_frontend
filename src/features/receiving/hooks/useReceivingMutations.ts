import { useMutation, useQueryClient } from '@tanstack/react-query'
import { receivingService } from '../services/receivingService'
import { receivingQueryKeys } from './useReceivingQueries'
import type { ConfirmReceiptPayload, SubmitInspectionPayload } from '../types'
import { stockQueryKeys } from '@/features/inventory/hooks/useStockQueries'
import { warehouseQueryKeys } from '@/features/inventory/hooks/useWarehouses'
import { productQueryKeys } from '@/features/product/hooks/useProducts'
import { purchaseOrderQueryKeys } from '@/features/purchase/hooks/usePurchaseOrders'

/**
 * 收货与验收写动作：
 * - 确认收货 / 提交验收都会整体失效本域查询（单据列表、详情与关联单据联查）；
 * - 两个动作都推进采购订单状态（shipped → received → inspected），
 *   因此同时失效采购订单域查询，订单列表 / 详情状态即时刷新；
 * - 提交验收即入库（合格数量生成入库流水）：库存台账 / 流水 / 预警、
 *   商品 totalStock 与仓库统计投影随之变化，一并失效刷新。
 */

export function useReceivingMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: receivingQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: stockQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
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
