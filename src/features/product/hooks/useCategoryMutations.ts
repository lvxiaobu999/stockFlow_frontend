import { useMutation, useQueryClient } from '@tanstack/react-query'
import { categoryService } from '@/features/product/services/categoryService'
import { productQueryKeys } from '@/features/product/hooks/useProducts'
import type { CreateCategoryPayload, UpdateCategoryPayload } from '@/features/product/types'
import type { EnableStatus } from '@/types/common'
import { categoryQueryKeys } from '@/features/product/hooks/useCategories'

/**
 * 分类增改停删 mutation 集合。
 *
 * 分类树同时被商品表单的分类下拉引用，且商品的分类可计数随增删变化，
 * 因此成功后商品与分类两组查询一并失效。
 */
export function useCategoryMutations() {
  const queryClient = useQueryClient()
  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
  }

  const create = useMutation({
    mutationFn: (payload: CreateCategoryPayload) => categoryService.create(payload),
    onSuccess: invalidateRelated,
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryPayload }) =>
      categoryService.update(id, payload),
    onSuccess: invalidateRelated,
  })
  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnableStatus }) => categoryService.toggleStatus(id, status),
    onSuccess: invalidateRelated,
  })
  const remove = useMutation({
    mutationFn: (id: string) => categoryService.remove(id),
    onSuccess: invalidateRelated,
  })

  return { create, update, toggleStatus, remove }
}
