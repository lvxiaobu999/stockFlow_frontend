import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { categoryService } from '@/features/product/services/categoryService'
import { buildCategoryPathMap, buildCategoryTree } from '@/features/product/utils/categoryTree'
import type { CategoryRecord } from '@/features/product/types'

export const categoryQueryKeys = {
  /** 分类查询共用的根 key，增删改后整体失效。 */
  all: ['product', 'categories'] as const,
  /** 全量列表 key（扁平结构）。 */
  list: () => [...categoryQueryKeys.all, 'list'] as const,
  /** 下一编码预览 key：随所选上级变化。 */
  nextCode: (parentId: string | null) => [...categoryQueryKeys.all, 'next-code', parentId ?? ''] as const,
}

export interface CategoriesQuery {
  /** 扁平分类记录（接口原样返回）。 */
  records: CategoryRecord[]
  /** 前端组树结果（buildCategoryTree：排序稳定、孤儿节点挂顶级）。 */
  tree: ReturnType<typeof buildCategoryTree>
  /** id → 「一级 / 二级 / 三级」路径映射，表格与详情展示用。 */
  pathMap: Map<string, string>
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<unknown>
}

/** 全量分类查询：一次拉取后在组树、路径映射与下拉选项间共享。 */
export function useCategories(): CategoriesQuery {
  const query = useQuery({
    queryKey: categoryQueryKeys.list(),
    queryFn: ({ signal }) => categoryService.getList(signal),
    placeholderData: keepPreviousData,
  })

  const records = useMemo(() => query.data ?? [], [query.data])
  const tree = useMemo(() => buildCategoryTree(records), [records])
  const pathMap = useMemo(() => buildCategoryPathMap(records), [records])

  return {
    records,
    tree,
    pathMap,
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}

/** 预览将分配的分类编码（新建弹窗用；enabled=false 时不请求，编辑态编码只读）。 */
export function useNextCategoryCode(parentId: string | null, enabled: boolean) {
  const query = useQuery({
    queryKey: categoryQueryKeys.nextCode(parentId),
    queryFn: ({ signal }) => categoryService.getNextCode(parentId, signal),
    enabled,
  })
  return {
    code: query.data ?? null,
    isLoading: query.isPending,
  }
}
