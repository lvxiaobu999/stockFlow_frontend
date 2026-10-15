import { useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/features/product/services/productService'
import { categoryQueryKeys } from '@/features/product/hooks/useCategories'
import { productQueryKeys } from '@/features/product/hooks/useProducts'
import type { ProductPayload } from '@/features/product/types'
import type { EnableStatus } from '@/types/common'

/**
 * 商品增改停 mutation 集合。
 *
 * 商品数量影响分类树的 productCount，且商品表单引用分类下拉，
 * 因此成功后商品与分类两组查询一并失效。
 */
export function useProductMutations() {
  const queryClient = useQueryClient()
  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all })
  }

  const create = useMutation({
    mutationFn: (payload: ProductPayload) => productService.create(payload),
    onSuccess: invalidateRelated,
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductPayload }) => productService.update(id, payload),
    onSuccess: invalidateRelated,
  })
  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnableStatus }) => productService.toggleStatus(id, status),
    onSuccess: invalidateRelated,
  })

  return { create, update, toggleStatus }
}
