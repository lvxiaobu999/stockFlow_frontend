import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { StockAdjustPayload } from '@/features/inventory/types'
import { stockService } from '@/features/inventory/services/stockService'
import { stockQueryKeys } from './useStockQueries'
import { warehouseQueryKeys } from './useWarehouses'
import { productQueryKeys } from '@/features/product/hooks/useProducts'

/**
 * 库存调整：期初录入与库存纠错同一入口（服务端写调整流水 + 推导更新库存）。
 *
 * 调整会同时改变三侧投影：库存台账 / 流水 / 预警（本域）、仓库统计列、
 * 商品 totalStock（库存金额、商品列表预警），一并失效刷新。
 */
export function useStockAdjust() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: StockAdjustPayload) => stockService.adjustStock(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stockQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    },
  })
}
