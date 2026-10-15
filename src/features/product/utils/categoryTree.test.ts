import { describe, expect, it } from 'vitest'
import type { CategoryRecord } from '@/features/product/types'
import { buildCategoryPathMap, buildCategoryTree, collectSelfAndDescendantIds, toCategoryOptions } from './categoryTree'

/** 构造测试分类的快捷工厂；字段顺序固定保证快照可读。 */
function makeCategory(
  partial: Pick<CategoryRecord, 'id' | 'parentId' | 'name' | 'code'> & Partial<CategoryRecord>,
): CategoryRecord {
  return {
    sort: 0,
    status: 1,
    productCount: 0,
    createdAt: '2026-09-01 10:00:00',
    updatedAt: '2026-09-01 10:00:00',
    ...partial,
  }
}

const sampleList: CategoryRecord[] = [
  makeCategory({ id: 'c2', parentId: null, name: 'IT 设备', code: '020000', sort: 2 }),
  makeCategory({ id: 'c1-2', parentId: 'c1', name: '书写工具', code: '010200', sort: 2 }),
  makeCategory({ id: 'c1', parentId: null, name: '办公用品', code: '010000', sort: 1 }),
  makeCategory({ id: 'c1-1', parentId: 'c1', name: '纸张纸品', code: '010100', sort: 1 }),
  makeCategory({ id: 'c1-1-1', parentId: 'c1-1', name: '复印纸', code: '010101', sort: 1 }),
  makeCategory({ id: 'c1-2-1', parentId: 'c1-2', name: '铅笔', code: '010201', sort: 1, status: 0 }),
]

describe('buildCategoryTree', () => {
  it('按 parentId 组树并稳定排序（sort 升序，与输入顺序无关）', () => {
    const tree = buildCategoryTree(sampleList)
    expect(tree.map((node) => node.name)).toEqual(['办公用品', 'IT 设备'])
    const office = tree[0]
    expect(office.children?.map((node) => node.name)).toEqual(['纸张纸品', '书写工具'])
    expect(office.children?.[0].children?.[0].name).toBe('复印纸')
  })

  it('悬空 parentId 按顶级处理，不抛错', () => {
    const tree = buildCategoryTree([makeCategory({ id: 'x', parentId: 'ghost', name: '孤儿', code: '990000' })])
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('孤儿')
  })
})

describe('collectSelfAndDescendantIds', () => {
  it('包含自身与全部子孙', () => {
    const ids = collectSelfAndDescendantIds(sampleList, 'c1')
    expect(ids.has('c1')).toBe(true)
    expect(ids.has('c1-1')).toBe(true)
    expect(ids.has('c1-1-1')).toBe(true)
    expect(ids.has('c1-2-1')).toBe(true)
    expect(ids.has('c2')).toBe(false)
  })
})

describe('buildCategoryPathMap', () => {
  it('生成「一级 / 二级 / 三级」完整路径', () => {
    const pathById = buildCategoryPathMap(sampleList)
    expect(pathById.get('c1-1-1')).toBe('办公用品 / 纸张纸品 / 复印纸')
    expect(pathById.get('c2')).toBe('IT 设备')
  })
})

describe('toCategoryOptions', () => {
  it('停用节点 disabled，节点同时带 label 与 title', () => {
    const options = toCategoryOptions(sampleList)
    const writing = options[0].children?.find((node) => node.value === 'c1-2')
    const pencil = writing?.children?.find((node) => node.value === 'c1-2-1')
    expect(pencil?.disabled).toBe(true)
    expect(pencil?.label).toBe('铅笔')
    expect(pencil?.title).toBe('铅笔')
  })

  it('excludeId 排除自身及子孙（编辑分类时上级不可选自己子树）', () => {
    const options = toCategoryOptions(sampleList, { excludeId: 'c1' })
    // c1 整棵子树被剪掉，只剩 IT 设备。
    expect(options.map((node) => node.value)).toEqual(['c2'])
  })
})
