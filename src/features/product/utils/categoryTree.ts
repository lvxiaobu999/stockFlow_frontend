/**
 * 商品分类树的前端纯工具。
 *
 * 接口返回扁平列表（镜像数据库表），树结构、面包屑与 Cascader/TreeSelect 的
 * 选项数据统一在这里派生，保证各消费方口径一致并方便单元测试。
 */
import type { CategoryRecord, CategoryTreeNode } from '@/features/product/types'

/** 稳定排序：sort 升序，同 sort 按编码，避免同值时顺序抖动。 */
function compareCategory(a: CategoryRecord, b: CategoryRecord): number {
  return a.sort - b.sort || a.code.localeCompare(b.code)
}

/** 扁平分类列表 → 树（sort 升序稳定排序；脏数据 parentId 悬空时按顶级处理）。 */
export function buildCategoryTree(list: CategoryRecord[]): CategoryTreeNode[] {
  const nodesById = new Map<string, CategoryTreeNode>()
  for (const item of list) {
    nodesById.set(item.id, { ...item })
  }

  const roots: CategoryTreeNode[] = []
  for (const node of nodesById.values()) {
    const parent = node.parentId ? nodesById.get(node.parentId) : undefined
    if (parent) {
      parent.children = parent.children ?? []
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortRecursively = (nodes: CategoryTreeNode[]) => {
    nodes.sort(compareCategory)
    for (const node of nodes) {
      if (node.children) sortRecursively(node.children)
    }
  }
  sortRecursively(roots)
  return roots
}

/** 收集自身及全部子孙的 id 集合：编辑分类时用于排除非法上级。 */
export function collectSelfAndDescendantIds(list: CategoryRecord[], rootId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>()
  for (const item of list) {
    if (!item.parentId) continue
    const siblings = childrenByParent.get(item.parentId) ?? []
    siblings.push(item.id)
    childrenByParent.set(item.parentId, siblings)
  }

  const ids = new Set<string>()
  const stack = [rootId]
  while (stack.length > 0) {
    const current = stack.pop() as string
    if (ids.has(current)) continue
    ids.add(current)
    for (const childId of childrenByParent.get(current) ?? []) stack.push(childId)
  }
  return ids
}

/** 按 id 查找分类。 */
export function findCategoryById(list: CategoryRecord[], id: string): CategoryRecord | undefined {
  return list.find((item) => item.id === id)
}

/** 构建 id → 「一级 / 二级 / 三级」完整路径映射，供商品列表面包屑列与详情概要使用。 */
export function buildCategoryPathMap(list: CategoryRecord[]): Map<string, string> {
  const nodeById = new Map(list.map((item) => [item.id, item]))
  const pathById = new Map<string, string>()

  const pathOf = (item: CategoryRecord): string => {
    const cached = pathById.get(item.id)
    if (cached) return cached
    const parent = item.parentId ? nodeById.get(item.parentId) : undefined
    // 悬空 parentId 按顶级处理，避免死循环与空路径。
    const path = parent && parent.id !== item.id ? `${pathOf(parent)} / ${item.name}` : item.name
    pathById.set(item.id, path)
    return path
  }

  for (const item of list) pathOf(item)
  return pathById
}

/** 分类选项节点：同时带 label 与 title（Cascader 读 label、TreeSelect 读 title）。 */
export interface CategoryOptionNode {
  value: string
  label: string
  title: string
  disabled?: true
  children?: CategoryOptionNode[]
}

/**
 * 扁平分类 → 级联/树选择选项。
 *
 * - 停用节点（status=0）置 disabled：停用分类下不可再挂新分类或新商品；
 * - excludeId：编辑场景排除自身及子孙（上级分类不可选自己或自己的子树）。
 */
export function toCategoryOptions(list: CategoryRecord[], options?: { excludeId?: string }): CategoryOptionNode[] {
  const excluded = options?.excludeId ? collectSelfAndDescendantIds(list, options.excludeId) : null
  const tree = buildCategoryTree(list)

  const toNode = (node: CategoryTreeNode): CategoryOptionNode => ({
    value: node.id,
    label: node.name,
    title: node.name,
    disabled: node.status === 0 || undefined,
    children: node.children?.map(toNode),
  })

  if (!excluded) return tree.map(toNode)

  const prune = (nodes: CategoryTreeNode[]): CategoryOptionNode[] =>
    nodes
      .filter((node) => !excluded.has(node.id))
      .map((node) => {
        const option = toNode(node)
        return node.children ? { ...option, children: prune(node.children) } : option
      })
  return prune(tree)
}
