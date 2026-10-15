import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supplierService } from '@/features/supplier/services/supplierService'
import { supplierQueryKeys } from '@/features/supplier/hooks/useSuppliers'
import type { CreateSupplierPayload, UpdateSupplierPayload } from '@/features/supplier/types'
import type { EnableStatus } from '@/types/common'

/** 供应商增改停 mutation 集合：成功后失效供应商全部查询。 */
export function useSupplierMutations() {
  const queryClient = useQueryClient()
  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all })
  }

  const create = useMutation({
    mutationFn: (payload: CreateSupplierPayload) => supplierService.create(payload),
    onSuccess: invalidateRelated,
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSupplierPayload }) =>
      supplierService.update(id, payload),
    onSuccess: invalidateRelated,
  })
  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnableStatus }) => supplierService.toggleStatus(id, status),
    onSuccess: invalidateRelated,
  })

  return { create, update, toggleStatus }
}
