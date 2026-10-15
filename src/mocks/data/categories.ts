import dayjs from 'dayjs'
import type { CategoryRecord } from '@/features/product/types'
import { productsMock } from './products'

/**
 * 商品分类 Mock 数据：18 个节点、最多 3 级（与数据库表同构的扁平存储）。
 *
 * - 编码为层级段式：2 位一段（010000 → 010100 → 010101）；
 * - 010202 铅笔为停用演示节点（无子级、无商品，可删除）；
 * - productCount（子树商品计数）不入种子，由 handler 实时统计后拼装返回。
 */

/** 种子形态：时间戳由下方确定性生成，不入种子。 */
type CategorySeed = Omit<CategoryRecord, 'productCount' | 'createdAt' | 'updatedAt'>

/** 存储形态：含时间戳；productCount 不落库，由 handler 实时统计后拼装。 */
export type CategoryStored = Omit<CategoryRecord, 'productCount'>

const categorySeeds: CategorySeed[] = [
  // ── 01 办公用品 ──────────────────────────────────────────────────────
  { id: 'cat-010000', parentId: null, name: '办公用品', code: '010000', sort: 1, status: 1 },
  { id: 'cat-010100', parentId: 'cat-010000', name: '纸张纸品', code: '010100', sort: 1, status: 1 },
  { id: 'cat-010101', parentId: 'cat-010100', name: '复印纸', code: '010101', sort: 1, status: 1 },
  { id: 'cat-010102', parentId: 'cat-010100', name: '打印纸', code: '010102', sort: 2, status: 1 },
  { id: 'cat-010200', parentId: 'cat-010000', name: '书写工具', code: '010200', sort: 2, status: 1 },
  { id: 'cat-010201', parentId: 'cat-010200', name: '签字笔', code: '010201', sort: 1, status: 1 },
  {
    id: 'cat-010202',
    parentId: 'cat-010200',
    name: '铅笔',
    code: '010202',
    sort: 2,
    status: 0,
    remark: '品类收缩，仅存档',
  },
  { id: 'cat-010300', parentId: 'cat-010000', name: '打印耗材', code: '010300', sort: 3, status: 1 },
  { id: 'cat-010301', parentId: 'cat-010300', name: '硒鼓', code: '010301', sort: 1, status: 1 },
  // ── 02 IT 设备 ───────────────────────────────────────────────────────
  { id: 'cat-020000', parentId: null, name: 'IT 设备', code: '020000', sort: 2, status: 1 },
  { id: 'cat-020100', parentId: 'cat-020000', name: '电脑整机', code: '020100', sort: 1, status: 1 },
  { id: 'cat-020200', parentId: 'cat-020000', name: '电脑配件', code: '020200', sort: 2, status: 1 },
  { id: 'cat-020201', parentId: 'cat-020200', name: '键鼠套装', code: '020201', sort: 1, status: 1 },
  // ── 03 后勤用品 ──────────────────────────────────────────────────────
  { id: 'cat-030000', parentId: null, name: '后勤用品', code: '030000', sort: 3, status: 1 },
  { id: 'cat-030100', parentId: 'cat-030000', name: '清洁用品', code: '030100', sort: 1, status: 1 },
  // ── 04 办公家具 ──────────────────────────────────────────────────────
  { id: 'cat-040000', parentId: null, name: '办公家具', code: '040000', sort: 4, status: 1 },
  { id: 'cat-040100', parentId: 'cat-040000', name: '办公桌椅', code: '040100', sort: 1, status: 1 },
  { id: 'cat-040200', parentId: 'cat-040000', name: '储物设备', code: '040200', sort: 2, status: 1 },
]

// 建档时间按序号递减生成，保证确定性（与用户/商品数据同口径）。
export const categoryMock: CategoryStored[] = categorySeeds.map((seed, index) => {
  const createdAt = dayjs('2026-03-01 09:00:00')
    .subtract(index * 5, 'day')
    .format('YYYY-MM-DD HH:mm:ss')
  return { ...seed, createdAt, updatedAt: createdAt }
})

/** 按 id 查找分类。 */
export function findCategoryById(id: string): CategoryStored | undefined {
  return categoryMock.find((item) => item.id === id)
}

/** 编码层级：两位一段，第 2/3 段是否为 00 判定层级（010000=一级 010100=二级 010101=三级）。 */
export function categoryLevel(code: string): 1 | 2 | 3 {
  if (code.slice(4, 6) !== '00') return 3
  if (code.slice(2, 4) !== '00') return 2
  return 1
}

/**
 * 生成下一个分类编码（服务端生成口径，两位一段、全长 6 位）：
 * 顶级 = 最大根段 + 1；二级 = 根段 + 同级最大序号 + 1 + 00；三级同理取前 4 位。
 */
export function generateCategoryCode(parentId: string | null): string {
  const pad2 = (value: number) => String(value).padStart(2, '0')
  if (!parentId) {
    const maxRoot = Math.max(
      0,
      ...categoryMock.filter((item) => item.parentId === null).map((item) => Number(item.code.slice(0, 2))),
    )
    return `${pad2(maxRoot + 1)}0000`
  }
  // handler 会先行校验上级存在，这里兜底断言。
  const parent = categoryMock.find((item) => item.id === parentId) as CategoryStored
  const level = categoryLevel(parent.code)
  if (level >= 3) {
    // handler 会先行校验层级，这里是最后防线（防止 7 位非法编码入库）。
    throw new Error('分类层级已达上限（最多 3 级）')
  }
  const prefix = parent.code.slice(0, level * 2)
  const suffixStart = level * 2
  const maxSibling = Math.max(
    0,
    ...categoryMock
      .filter((item) => item.parentId === parentId)
      .map((item) => Number(item.code.slice(suffixStart, suffixStart + 2))),
  )
  return `${prefix}${pad2(maxSibling + 1)}${level === 1 ? '00' : ''}`
}

/** 收集子孙 id 集合（不含自身）：删除与移动分类的前置校验共用。 */
export function collectDescendantIds(rootId: string): Set<string> {
  const ids = new Set<string>()
  const stack = categoryMock.filter((item) => item.parentId === rootId).map((item) => item.id)
  while (stack.length > 0) {
    const current = stack.pop() as string
    if (ids.has(current)) continue
    ids.add(current)
    for (const child of categoryMock.filter((item) => item.parentId === current)) stack.push(child.id)
  }
  return ids
}

/** 子树商品计数：分类树展示与「有商品不可删除」校验共用（含全部子孙）。 */
export function countProductsInSubtree(categoryId: string): number {
  const ids = collectDescendantIds(categoryId)
  ids.add(categoryId)
  return productsMock.filter((product) => ids.has(product.categoryId)).length
}
