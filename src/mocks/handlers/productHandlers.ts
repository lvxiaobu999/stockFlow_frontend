import dayjs from 'dayjs'
import { delay, http } from 'msw'
import type { ProductListParams, ProductPayload, ProductRecord } from '@/features/product/types'
import type { EnableStatus } from '@/types/common'
import { getMockSession } from '@/mocks/data/auth'
import { collectDescendantIds, findCategoryById } from '@/mocks/data/categories'
import { appendLog } from '@/mocks/data/operation-logs'
import { buildProductRecentTransactions, buildProductStockSummary } from '@/mocks/data/inventory'
import { nextProductCode, productsMock } from '@/mocks/data/products'
import { paginate } from '@/mocks/pagination'
import { businessError, httpError, ok } from '@/mocks/utils'

/** 解析查询参数为列表过滤条件（MSW 的 URL 参数均为字符串）。 */
function parseParams(url: URL): ProductListParams & { pageSize: number } {
  const current = Number(url.searchParams.get('current') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
  const status = url.searchParams.get('status')
  return {
    keyword: url.searchParams.get('keyword') ?? undefined,
    categoryId: url.searchParams.get('categoryId') ?? undefined,
    status: status === null || status === '' ? undefined : (Number(status) as EnableStatus),
    stockBelowSafety: url.searchParams.get('stockBelowSafety') === 'true',
    current,
    pageSize,
  }
}

/**
 * 按列表参数过滤商品（keyword 模糊匹配编码 / 名称 / 规格）。
 * categoryId 匹配「所选分类及其全部子分类」，与分类树 productCount 的子树口径一致。
 */
function filterProducts(params: ProductListParams): ProductRecord[] {
  const keyword = params.keyword?.trim()
  // 子树 id 集合在过滤前算一次，避免逐行重复遍历分类表。
  const categoryIds = params.categoryId
    ? (() => {
        const ids = collectDescendantIds(params.categoryId)
        ids.add(params.categoryId)
        return ids
      })()
    : null
  return productsMock.filter((product) => {
    if (keyword && !`${product.code}${product.name}${product.spec}`.includes(keyword)) return false
    if (categoryIds && !categoryIds.has(product.categoryId)) return false
    if (params.status !== undefined && product.status !== params.status) return false
    if (params.stockBelowSafety && product.totalStock >= product.safetyStock) return false
    return true
  })
}

/** 商品审计日志便捷封装（模块固定为商品管理）。 */
function logProduct(operator: string, action: string, targetSummary: string): void {
  appendLog({ operator, module: 'product', action, targetSummary })
}

/** 所属分类校验：必须存在且未停用（停用分类下不可新建/移入商品）。 */
function findCategoryError(categoryId: string) {
  const category = findCategoryById(categoryId)
  if (!category || category.status === 0) return businessError(4203, '所属分类不存在或已停用')
  return null
}

/** 商品接口：分页、编码预取、新建、编辑、启停、详情与库存演示数据。 */
export const productHandlers = [
  http.get('*/api/product/next-code', async () => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    return ok(nextProductCode())
  }),

  // options 必须注册在 /:id 之前，否则 "options" 会被当作 id 匹配。
  http.get('*/api/product/options', async () => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    // 仅启用商品可被采购单据引用；预警字段供「从预警商品带入」前端过滤。
    return ok(
      productsMock
        .filter((product) => product.status === 1)
        .map((product) => ({
          id: product.id,
          code: product.code,
          name: product.name,
          spec: product.spec,
          unit: product.unit,
          purchasePrice: product.purchasePrice,
          safetyStock: product.safetyStock,
          totalStock: product.totalStock,
        })),
    )
  }),

  http.get('*/api/product/page', async ({ request }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const params = parseParams(new URL(request.url))
    return ok(paginate(filterProducts(params), params.current, params.pageSize))
  }),

  http.post('*/api/product', async ({ request }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const body = (await request.json()) as Partial<ProductPayload>
    if (!body.name?.trim()) return businessError(4001, '商品名称不能为空')
    if (!body.categoryId) return businessError(4001, '请选择商品分类')
    const categoryError = findCategoryError(body.categoryId)
    if (categoryError) return categoryError

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const record: ProductRecord = {
      id: `prod-${dayjs(now).format('MMDDHHmmss')}`,
      code: nextProductCode(),
      name: body.name.trim(),
      spec: body.spec ?? '',
      unit: body.unit ?? '个',
      categoryId: body.categoryId,
      purchasePrice: body.purchasePrice ?? 0,
      salePrice: body.salePrice,
      safetyStock: body.safetyStock ?? 0,
      // 新建商品尚无库存，库存模块上线后由入库流水累计。
      totalStock: 0,
      imageUrl: body.imageUrl,
      description: body.description,
      status: body.status ?? 1,
      createdAt: now,
      updatedAt: now,
    }
    productsMock.unshift(record)
    logProduct(session.user.name, '新建商品', `商品 ${record.name}（${record.code}）`)
    return ok(record)
  }),

  http.put('*/api/product/:id', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = productsMock.find((item) => item.id === params.id)
    if (!record) return businessError(4201, '商品不存在或已被移除')
    const body = (await request.json()) as Partial<ProductPayload>

    if (body.categoryId !== undefined && body.categoryId !== record.categoryId) {
      const categoryError = findCategoryError(body.categoryId)
      if (categoryError) return categoryError
      record.categoryId = body.categoryId
    }
    // 商品编码创建后不可修改，这里刻意不读取 body 中的编码字段。
    if (body.name !== undefined) record.name = body.name
    if (body.spec !== undefined) record.spec = body.spec
    if (body.unit !== undefined) record.unit = body.unit
    if (body.purchasePrice !== undefined) record.purchasePrice = body.purchasePrice
    if (body.salePrice !== undefined) record.salePrice = body.salePrice
    if (body.safetyStock !== undefined) record.safetyStock = body.safetyStock
    if (body.imageUrl !== undefined) record.imageUrl = body.imageUrl
    if (body.description !== undefined) record.description = body.description
    if (body.status !== undefined) record.status = body.status
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    logProduct(session.user.name, '编辑商品', `商品 ${record.name}（${record.code}）`)
    return ok(record)
  }),

  http.put('*/api/product/:id/status', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = productsMock.find((item) => item.id === params.id)
    if (!record) return businessError(4201, '商品不存在或已被移除')

    const body = (await request.json()) as { status?: EnableStatus }
    const nextStatus = body.status ?? (record.status === 1 ? 0 : 1)
    record.status = nextStatus
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    logProduct(session.user.name, nextStatus === 1 ? '启用商品' : '停用商品', `商品 ${record.name}（${record.code}）`)
    return ok(record)
  }),

  http.get('*/api/product/:id/stock-summary', async ({ params }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const record = productsMock.find((item) => item.id === params.id)
    if (!record) return businessError(4201, '商品不存在或已被移除')
    // 库存模块落地后由真实库存行组装（mocks/data/inventory.ts）。
    return ok(buildProductStockSummary(record))
  }),

  http.get('*/api/product/:id/stock-transactions', async ({ request, params }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const record = productsMock.find((item) => item.id === params.id)
    if (!record) return businessError(4201, '商品不存在或已被移除')
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? '5')
    return ok(buildProductRecentTransactions(record, limit))
  }),

  http.get('*/api/product/:id', async ({ params }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const record = productsMock.find((item) => item.id === params.id)
    if (!record) return businessError(4201, '商品不存在或已被移除')
    return ok(record)
  }),
]
