import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { productService } from '@/features/product/services/productService'
import type {
  ProductListParams,
  ProductOption,
  ProductRecord,
  ProductStockSummary,
  ProductStockTransaction,
} from '@/features/product/types'
import type { PaginatedData } from '@/services/httpClient'

export const productQueryKeys = {
  /** 商品查询共用的根 key，增删改后整体失效。 */
  all: ['product', 'products'] as const,
  /** 分页查询 key：筛选与分页参数全部进入 key，保证不同查询互不串缓存。 */
  page: (params: ProductListParams) => [...productQueryKeys.all, 'page', params] as const,
  /** 下拉选项 key：与分页查询分离，避免失效粒度过大。 */
  options: () => [...productQueryKeys.all, 'options'] as const,
  /** 详情 key：id 为空字符串时不发起请求。 */
  detail: (id: string) => [...productQueryKeys.all, 'detail', id] as const,
  /** 库存汇总（按仓库）key。 */
  stockSummary: (id: string) => [...productQueryKeys.all, 'stock-summary', id] as const,
  /** 最近库存流水 key。 */
  transactions: (id: string, limit: number) => [...productQueryKeys.all, 'transactions', id, limit] as const,
  /** 下一个商品编码（表单进入时预取展示）。 */
  nextCode: () => [...productQueryKeys.all, 'next-code'] as const,
}

/** 商品分页查询：翻页时保留上一页数据（placeholderData），避免整表闪烁。 */
export function useProducts(params: ProductListParams) {
  const query = useQuery({
    queryKey: productQueryKeys.page(params),
    queryFn: ({ signal }) => productService.getPage(params, signal),
    placeholderData: keepPreviousData,
  })

  return {
    data: (query.data ?? null) as PaginatedData<ProductRecord> | null,
    isLoading: query.isPending,
    /** 翻页或失效后的重新请求中，用于表格的轻量 loading。 */
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/** 商品下拉选项（仅启用商品）：采购单据选品用；选项短期稳定，缓存 5 分钟。 */
export function useProductOptions() {
  const query = useQuery({
    queryKey: productQueryKeys.options(),
    queryFn: ({ signal }) => productService.getOptions(signal),
    staleTime: 5 * 60 * 1000,
  })
  return {
    data: (query.data ?? []) as ProductOption[],
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 商品详情；id 为空字符串时不发起请求（详情/编辑视图未打开）。 */
export function useProductDetail(id: string) {
  const query = useQuery({
    queryKey: productQueryKeys.detail(id),
    queryFn: ({ signal }) => productService.getDetail(id, signal),
    enabled: id !== '',
  })
  return {
    data: (query.data ?? null) as ProductRecord | null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 库存汇总（按仓库，演示契约）；id 为空字符串时不发起请求。 */
export function useProductStockSummary(id: string) {
  const query = useQuery({
    queryKey: productQueryKeys.stockSummary(id),
    queryFn: ({ signal }) => productService.getStockSummary(id, signal),
    enabled: id !== '',
  })
  return {
    data: (query.data ?? null) as ProductStockSummary | null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 最近库存流水（演示契约）；id 为空字符串时不发起请求。 */
export function useProductStockTransactions(id: string, limit = 5) {
  const query = useQuery({
    queryKey: productQueryKeys.transactions(id, limit),
    queryFn: ({ signal }) => productService.getStockTransactions(id, limit, signal),
    enabled: id !== '',
  })
  return {
    data: (query.data ?? null) as ProductStockTransaction[] | null,
    isLoading: query.isPending,
    error: query.error,
  }
}

/** 预取下一个商品编码（新建表单展示用；enabled=false 时不请求，编辑态编码只读）。 */
export function useNextProductCode(enabled: boolean) {
  const query = useQuery({
    queryKey: productQueryKeys.nextCode(),
    queryFn: ({ signal }) => productService.getNextCode(signal),
    enabled,
  })
  return {
    code: query.data ?? null,
    isLoading: query.isPending,
  }
}
