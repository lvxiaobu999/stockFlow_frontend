import { useMutation, useQueryClient } from '@tanstack/react-query'
import { warehouseService } from '@/features/inventory/services/warehouseService'
import { warehouseQueryKeys } from '@/features/inventory/hooks/useWarehouses'
import type { CreateWarehousePayload, UpdateWarehousePayload } from '@/features/inventory/types'
import type { EnableStatus } from '@/types/common'

/** 仓库增改停 mutation 集合：成功后失效仓库全部查询。 */
export function useWarehouseMutations() {
  const queryClient = useQueryClient()
  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.all })
  }

  const create = useMutation({
    mutationFn: (payload: CreateWarehousePayload) => warehouseService.create(payload),
    onSuccess: invalidateRelated,
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWarehousePayload }) =>
      warehouseService.update(id, payload),
    onSuccess: invalidateRelated,
  })
  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnableStatus }) => warehouseService.toggleStatus(id, status),
    onSuccess: invalidateRelated,
  })

  return { create, update, toggleStatus }
}
