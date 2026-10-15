import type { CategoryRecord, CreateCategoryPayload, UpdateCategoryPayload } from '@/features/product/types'
import type { EnableStatus } from '@/types/common'
import { request } from '@/services/httpClient'

/** 商品分类服务：编码由服务端生成；删除前置校验（有子级 4102 / 有商品 4103）在后端。 */
export const categoryService = {
  /** 预取将分配的分类编码（新建弹窗按所选上级实时预览）。 */
  async getNextCode(parentId: string | null, signal?: AbortSignal): Promise<string> {
    return request<string>('/product/category/next-code', {
      params: { parentId: parentId ?? '' },
      signal,
    })
  },

  /** 全量分类列表（扁平结构，树由前端 buildCategoryTree 构建）。 */
  async getList(signal?: AbortSignal): Promise<CategoryRecord[]> {
    return request<CategoryRecord[]>('/product/category/list', { signal })
  },

  /** 新建分类；同级重名 4002，上级不合法 4104。 */
  async create(payload: CreateCategoryPayload): Promise<CategoryRecord> {
    return request<CategoryRecord>('/product/category', { method: 'POST', data: payload })
  },

  /** 编辑分类；上级不可选自身/子孙（4104），同级重名 4002。 */
  async update(id: string, payload: UpdateCategoryPayload): Promise<CategoryRecord> {
    return request<CategoryRecord>(`/product/category/${id}`, { method: 'PUT', data: payload })
  },

  /** 启用 / 停用分类。停用后不可在其下新增分类、商品表单中不可选。 */
  async toggleStatus(id: string, status: EnableStatus): Promise<CategoryRecord> {
    return request<CategoryRecord>(`/product/category/${id}/status`, {
      method: 'PUT',
      data: { status },
    })
  },

  /** 删除分类：有子级或子树内有商品时后端拦截，前端只做二次确认。 */
  async remove(id: string): Promise<null> {
    return request<null>(`/product/category/${id}`, { method: 'DELETE' })
  },
}
