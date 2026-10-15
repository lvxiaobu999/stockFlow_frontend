import type {
  ProductListParams,
  ProductPayload,
  ProductRecord,
  ProductStockSummary,
  ProductStockTransaction,
} from '@/features/product/types'
import type { EnableStatus } from '@/types/common'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/**
 * 商品档案服务：编码服务端生成（SP-YYYYMMDD-NNNN）、创建后不可修改；
 * 库存汇总与流水为库存模块落地前的演示契约。
 */
export const productService = {
  /** 预取下一个商品编码（表单视图进入时展示，服务端保存时再次生成兜底）。 */
  async getNextCode(signal?: AbortSignal): Promise<string> {
    return request<string>('/product/next-code', { signal })
  },

  /** 分页查询商品；stockBelowSafety=true 时仅返回低于安全库存的预警商品。 */
  async getPage(params: ProductListParams, signal?: AbortSignal): Promise<PaginatedData<ProductRecord>> {
    return request<PaginatedData<ProductRecord>>('/product/page', { params, signal })
  },

  /** 新建商品；所属分类停用或不存在时后端返回业务码 4203。 */
  async create(payload: ProductPayload): Promise<ProductRecord> {
    return request<ProductRecord>('/product', { method: 'POST', data: payload })
  },

  /** 编辑商品；编码不可修改（服务端忽略载荷中的编码字段）。 */
  async update(id: string, payload: ProductPayload): Promise<ProductRecord> {
    return request<ProductRecord>(`/product/${id}`, { method: 'PUT', data: payload })
  },

  /** 启用 / 停用商品。停用后不可被新单据引用，历史单据不受影响。 */
  async toggleStatus(id: string, status: EnableStatus): Promise<ProductRecord> {
    return request<ProductRecord>(`/product/${id}/status`, { method: 'PUT', data: { status } })
  },

  /** 商品详情。 */
  async getDetail(id: string, signal?: AbortSignal): Promise<ProductRecord> {
    return request<ProductRecord>(`/product/${id}`, { signal })
  },

  /** 库存汇总（按仓库）：库存模块落地前的演示契约。 */
  async getStockSummary(id: string, signal?: AbortSignal): Promise<ProductStockSummary> {
    return request<ProductStockSummary>(`/product/${id}/stock-summary`, { signal })
  },

  /** 最近库存流水（默认 5 条）：库存模块落地前的演示契约。 */
  async getStockTransactions(id: string, limit = 5, signal?: AbortSignal): Promise<ProductStockTransaction[]> {
    return request<ProductStockTransaction[]>(`/product/${id}/stock-transactions`, {
      params: { limit },
      signal,
    })
  },
}
