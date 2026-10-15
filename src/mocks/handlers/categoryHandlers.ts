import dayjs from 'dayjs'
import { delay, http } from 'msw'
import type { CategoryRecord, CreateCategoryPayload } from '@/features/product/types'
import type { EnableStatus } from '@/types/common'
import { getMockSession } from '@/mocks/data/auth'
import {
  categoryLevel,
  categoryMock,
  collectDescendantIds,
  countProductsInSubtree,
  findCategoryById,
  generateCategoryCode,
} from '@/mocks/data/categories'
import { appendLog } from '@/mocks/data/operation-logs'
import { businessError, httpError, ok } from '@/mocks/utils'

/** 分类的存储形态（不含实时统计字段）。 */
type CategoryStored = (typeof categoryMock)[number]

/** 存储 → API 记录：拼装实时的子树商品计数（含全部子孙）。 */
function toRecord(stored: CategoryStored): CategoryRecord {
  return { ...stored, productCount: countProductsInSubtree(stored.id) }
}

/** 商品分类审计日志便捷封装（模块固定为商品管理）。 */
function logCategory(operator: string, action: string, targetSummary: string): void {
  appendLog({ operator, module: 'product', action, targetSummary })
}

/** 上级分类合法性校验：存在、未停用、层级未满。 */
function findParentError(parentId: string) {
  const parent = findCategoryById(parentId)
  if (!parent) return businessError(4104, '上级分类不存在')
  if (parent.status === 0) return businessError(4104, '上级分类已停用，不可在其下新增分类')
  if (categoryLevel(parent.code) >= 3) return businessError(4104, '分类层级最多 3 级')
  return null
}

/** 同级名称唯一校验（编辑时排除自身）。 */
function hasSiblingNameDuplicate(name: string, parentId: string | null, excludeId?: string): boolean {
  return categoryMock.some((item) => item.parentId === parentId && item.name === name && item.id !== excludeId)
}

/** 商品分类接口：编码预取、全量列表、新建、编辑、启停与删除。 */
export const categoryHandlers = [
  http.get('*/product/category/next-code', async ({ request }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    // 按所选上级预览将分配的编码；parentId 为空表示顶级。
    const parentId = new URL(request.url).searchParams.get('parentId')
    return ok(generateCategoryCode(parentId ? parentId : null))
  }),

  http.get('*/product/category/list', async () => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    // 扁平结构返回，树由前端工具函数构建。
    return ok(categoryMock.map(toRecord))
  }),

  http.post('*/product/category', async ({ request }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const body = (await request.json()) as Partial<CreateCategoryPayload>
    const name = body.name?.trim()
    if (!name) return businessError(4001, '分类名称不能为空')
    const parentId = body.parentId ?? null
    if (parentId) {
      const parentError = findParentError(parentId)
      if (parentError) return parentError
    }
    if (hasSiblingNameDuplicate(name, parentId)) return businessError(4002, '同级下已存在同名分类')

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const code = generateCategoryCode(parentId)
    const record: CategoryStored = {
      id: `cat-${code}`,
      parentId,
      name,
      code,
      sort: body.sort ?? 1,
      status: body.status ?? 1,
      remark: body.remark,
      createdAt: now,
      updatedAt: now,
    }
    categoryMock.push(record)
    logCategory(session.user.name, '新建分类', `分类 ${name}（${code}）`)
    return ok(toRecord(record))
  }),

  http.put('*/product/category/:id', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = findCategoryById(params.id as string)
    if (!record) return businessError(4101, '分类不存在或已被删除')
    const body = (await request.json()) as Partial<CreateCategoryPayload>
    const name = body.name?.trim()
    if (!name) return businessError(4001, '分类名称不能为空')

    // 上级调整：不可选自身或子孙，其余与新增同级校验一致（编码不可修改，刻意不读取 body.code）。
    if (body.parentId !== undefined && body.parentId !== record.parentId) {
      const nextParentId = body.parentId
      if (nextParentId === null) {
        // 调整为顶级分类：无上级校验项。
        record.parentId = null
      } else {
        if (nextParentId === record.id) return businessError(4104, '上级分类不能选择自身')
        if (collectDescendantIds(record.id).has(nextParentId)) {
          return businessError(4104, '上级分类不能选择自身或其子分类')
        }
        const parentError = findParentError(nextParentId)
        if (parentError) return parentError
        record.parentId = nextParentId
      }
    }
    if (hasSiblingNameDuplicate(name, record.parentId, record.id)) {
      return businessError(4002, '同级下已存在同名分类')
    }

    record.name = name
    if (body.sort !== undefined) record.sort = body.sort
    if (body.status !== undefined) record.status = body.status
    if (body.remark !== undefined) record.remark = body.remark
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    logCategory(session.user.name, '编辑分类', `分类 ${record.name}（${record.code}）`)
    return ok(toRecord(record))
  }),

  http.put('*/product/category/:id/status', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = findCategoryById(params.id as string)
    if (!record) return businessError(4101, '分类不存在或已被删除')

    const body = (await request.json()) as { status?: EnableStatus }
    const nextStatus = body.status ?? (record.status === 1 ? 0 : 1)
    record.status = nextStatus
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    logCategory(session.user.name, nextStatus === 1 ? '启用分类' : '停用分类', `分类 ${record.name}（${record.code}）`)
    return ok(toRecord(record))
  }),

  http.delete('*/product/category/:id', async ({ params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = findCategoryById(params.id as string)
    if (!record) return businessError(4101, '分类不存在或已被删除')
    // 原型口径：被引用或有子分类的分类不可删除。
    if (categoryMock.some((item) => item.parentId === record.id)) {
      return businessError(4102, '存在子分类，无法删除')
    }
    if (countProductsInSubtree(record.id) > 0) {
      return businessError(4103, '该分类下存在商品，无法删除')
    }
    categoryMock.splice(categoryMock.indexOf(record), 1)
    logCategory(session.user.name, '删除分类', `分类 ${record.name}（${record.code}）`)
    return ok(null)
  }),
]
