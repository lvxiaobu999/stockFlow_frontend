import { useState } from 'react'
import { Alert, App, Button, Spin } from 'antd'
import { routeMeta } from '@/config/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { CategoryFormModal } from '@/features/product/components/category/CategoryFormModal'
import { CategoryProductPanel } from '@/features/product/components/category/CategoryProductPanel'
import { CategoryTreePanel } from '@/features/product/components/category/CategoryTreePanel'
import { useCategories } from '@/features/product/hooks/useCategories'
import { useCategoryMutations } from '@/features/product/hooks/useCategoryMutations'
import type { CategoryRecord, CategoryTreeNode } from '@/features/product/types'

/** 弹窗状态：编辑目标 + 「新建子分类」的预选上级。 */
interface CategoryModalState {
  open: boolean
  category: CategoryRecord | null
  initialParentId: string | null
}

const MODAL_CLOSED: CategoryModalState = { open: false, category: null, initialParentId: null }

/**
 * 商品分类页：左树（节点级增改停删）+ 右侧所选分类商品联动表。
 * 数据获取与 mutation 全部来自 features/product 的 hooks，这里只负责装配与编排。
 */
export default function CategoryPage() {
  const { message, modal } = App.useApp()
  const { has } = usePermissions()
  const { records, tree, pathMap, isLoading, error, refetch } = useCategories()
  const { toggleStatus, remove } = useCategoryMutations()

  const [pickedId, setPickedId] = useState<string | null>(null)
  const [modalState, setModalState] = useState<CategoryModalState>(MODAL_CLOSED)

  // 渲染期派生选中分类：未手动选择或所选已被删除时，回落到第一个顶级分类，
  // 避免「删除当前选中分类后右侧仍引用失效 id」与首屏空白的两个边界。
  const selectedId = pickedId && records.some((item) => item.id === pickedId) ? pickedId : (tree[0]?.id ?? '')

  const selected = records.find((item) => item.id === selectedId) ?? null

  const handleToggleStatus = (node: CategoryTreeNode) => {
    const nextStatus = node.status === 1 ? 0 : 1
    const run = () => {
      toggleStatus.mutate(
        { id: node.id, status: nextStatus },
        {
          onSuccess: () => message.success(`分类 ${node.name} 已${nextStatus === 1 ? '启用' : '停用'}`),
          onError: (error) => message.error(error.message),
        },
      )
    }
    if (nextStatus === 0) {
      // 停用影响商品表单可选分类与子分类新增，二次确认；启用直接执行。
      modal.confirm({
        title: `停用分类「${node.name}」`,
        content: '停用后不可在其下新增分类，商品表单中也不可选。确认停用？',
        okText: '停用',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: run,
      })
      return
    }
    run()
  }

  const handleDelete = (node: CategoryTreeNode) => {
    modal.confirm({
      title: `删除分类「${node.name}」`,
      content: '删除后不可恢复。存在子分类或子树内有商品时无法删除。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () =>
        remove.mutateAsync(node.id, {
          onSuccess: () => message.success(`分类 ${node.name} 已删除`),
          onError: (error) => message.error(error.message),
        }),
    })
  }

  return (
    <div className="dashboard-page">
      <PageHeader title={routeMeta.productCategory.title} description={routeMeta.productCategory.description} />
      {error ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message="分类加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <div className="mt-4 flex items-stretch gap-4">
        <div className="w-85 shrink-0">
          {isLoading && records.length === 0 ? (
            <div className="route-fallback" role="status" aria-label="分类加载中">
              <Spin size="large" />
            </div>
          ) : (
            <CategoryTreePanel
              tree={tree}
              loading={isLoading}
              selectedId={selectedId}
              onSelect={setPickedId}
              onCreate={(parentNode) =>
                setModalState({ open: true, category: null, initialParentId: parentNode?.id ?? null })
              }
              onEdit={(node) => setModalState({ open: true, category: node, initialParentId: null })}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              canCreate={has('product:category:create')}
              canEdit={has('product:category:update')}
              canToggle={has('product:category:toggle-status')}
              canDelete={has('product:category:delete')}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <CategoryProductPanel
            categoryId={selectedId}
            categoryPath={selected ? (pathMap.get(selected.id) ?? selected.name) : ''}
            productCount={selected?.productCount ?? 0}
          />
        </div>
      </div>
      <CategoryFormModal
        open={modalState.open}
        category={modalState.category}
        initialParentId={modalState.initialParentId}
        records={records}
        onClose={() => setModalState(MODAL_CLOSED)}
      />
    </div>
  )
}
