import { useMutation, useQueryClient } from '@tanstack/react-query'
import { portalService } from '../services/portalService'
import type { ConfirmOrderPayload, RejectOrderPayload, ShipOrderPayload } from '../types'
import { portalQueryKeys } from './usePortalQueries'
import { purchaseOrderQueryKeys } from '@/features/purchase/hooks/usePurchaseOrders'
import { supplierQueryKeys } from '@/features/supplier/hooks/useSuppliers'

/**
 * 门户写动作（确认 / 拒绝 / 发货）mutation 集合。
 *
 * 供应商动作会跨模块改变数据：订单状态推进（采购订单 / 门户两侧行列表）
 * 与供应商在途订单数变化。因此成功后同时失效门户、采购订单与供应商三个域的查询；
 * 采购申请域不受影响（确认 / 发货不回写申请状态），无需失效。
 */
export function usePortalMutations() {
  const queryClient = useQueryClient()

  /** 跨域失效：门户自身 + 采购订单 + 供应商（在途订单数）。 */
  const invalidateRelatedQueries = () => {
    queryClient.invalidateQueries({ queryKey: portalQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all })
  }

  const confirm = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ConfirmOrderPayload }) =>
      portalService.confirmOrder(id, payload),
    onSuccess: invalidateRelatedQueries,
  })

  const reject = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectOrderPayload }) =>
      portalService.rejectOrder(id, payload),
    onSuccess: invalidateRelatedQueries,
  })

  const ship = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ShipOrderPayload }) => portalService.shipOrder(id, payload),
    onSuccess: invalidateRelatedQueries,
  })

  return { confirm, reject, ship }
}
