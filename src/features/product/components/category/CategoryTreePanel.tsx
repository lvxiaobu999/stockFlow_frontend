import { useMemo } from 'react'
import { App, Button, Card, Dropdown, Empty, Spin, Tag, Tree, Typography } from 'antd'
import type { MenuProps } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { PlusOutlined, MoreOutlined } from '@ant-design/icons'
import type { CategoryTreeNode } from '@/features/product/types'

interface CategoryTreePanelProps {
  tree: CategoryTreeNode[]
  loading: boolean
  /** 当前选中分类 id（驱动右侧商品表）。 */
  selectedId: string
  onSelect: (id: string) => void
  onCreate: (parentNode: CategoryTreeNode | null) => void
  onEdit: (node: CategoryTreeNode) => void
  onToggleStatus: (node: CategoryTreeNode) => void
  onDelete: (node: CategoryTreeNode) => void
  canCreate: boolean
  canEdit: boolean
  canToggle: boolean
  canDelete: boolean
}

/** 三级编码判定：末段（第 5-6 位）非 00 即三级，其下不可再挂子分类。 */
function isLeafLevel(code: string): boolean {
  return code.slice(4, 6) !== '00'
}

/**
 * 商品分类树面板：左栏树 + 节点级操作（新建子分类 / 编辑 / 停用 / 删除）。
 *
 * 停用节点名称置灰；节点标签展示子树商品计数，与右侧商品表口径一致。
 */
export function CategoryTreePanel({
  tree,
  loading,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
  onToggleStatus,
  onDelete,
  canCreate,
  canEdit,
  canToggle,
  canDelete,
}: CategoryTreePanelProps) {
  const { message } = App.useApp()

  // antd Tree 需要 DataNode 结构；这里额外维护 id → 节点 的映射，
  // titleRender 里取完整记录渲染计数与操作，避免往 title 塞自定义字段。
  const treeData = useMemo<DataNode[]>(
    () =>
      tree.map(function toDataNode(node): DataNode {
        return {
          key: node.id,
          title: node.name,
          children: node.children?.map(toDataNode),
        }
      }),
    [tree],
  )
  const nodeById = useMemo(() => {
    const map = new Map<string, CategoryTreeNode>()
    const walk = (nodes: CategoryTreeNode[]) => {
      for (const node of nodes) {
        map.set(node.id, node)
        if (node.children) walk(node.children)
      }
    }
    walk(tree)
    return map
  }, [tree])

  const hasAnyAction = canCreate || canEdit || canToggle || canDelete

  const renderTitle = (node: CategoryTreeNode) => {
    const disabled = node.status === 0
    // 拦截在前端先行提示，服务端仍有最终校验（4104 层级 / 上级停用）。
    const childActionBlocked = isLeafLevel(node.code) || disabled

    const menuItems: MenuProps['items'] = [
      canCreate
        ? {
            key: 'create-child',
            label: '新建子分类',
            disabled: childActionBlocked,
            title: childActionBlocked ? (disabled ? '停用分类下不可新增子分类' : '分类层级最多 3 级') : undefined,
          }
        : null,
      canEdit ? { key: 'edit', label: '编辑' } : null,
      canToggle ? { key: 'toggle', label: disabled ? '启用' : '停用' } : null,
      canDelete ? { key: 'delete', label: '删除', danger: true } : null,
    ].filter((item) => item !== null)

    return (
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 py-0.5 pr-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <Typography.Text className="truncate" type={disabled ? 'secondary' : undefined}>
            {node.name}
          </Typography.Text>
          <Tag className="mr-0 shrink-0" color={node.productCount > 0 ? 'blue' : 'default'}>
            {node.productCount}
          </Tag>
        </span>
        {hasAnyAction && menuItems.length > 0 ? (
          <Dropdown
            trigger={['click']}
            menu={{
              items: menuItems,
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation()
                if (key === 'create-child') {
                  if (isLeafLevel(node.code)) {
                    message.warning('分类层级最多 3 级，无法再新增子分类')
                    return
                  }
                  onCreate(node)
                } else if (key === 'edit') {
                  onEdit(node)
                } else if (key === 'toggle') {
                  onToggleStatus(node)
                } else if (key === 'delete') {
                  onDelete(node)
                }
              },
            }}
          >
            <Button
              aria-label={`${node.name} 操作菜单`}
              className="shrink-0"
              icon={<MoreOutlined />}
              size="small"
              type="text"
              onClick={(event) => event.stopPropagation()}
            />
          </Dropdown>
        ) : null}
      </div>
    )
  }

  return (
    <Card
      size="small"
      className="h-full"
      title="分类结构"
      extra={
        canCreate ? (
          <Button icon={<PlusOutlined />} size="small" type="primary" onClick={() => onCreate(null)}>
            新建分类
          </Button>
        ) : null
      }
    >
      {loading && tree.length === 0 ? (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      ) : tree.length === 0 ? (
        <Empty className="py-10" description="暂无分类" />
      ) : (
        <Tree
          blockNode
          defaultExpandAll
          selectedKeys={selectedId ? [selectedId] : []}
          titleRender={(dataNode) => {
            const node = nodeById.get(String(dataNode.key))
            return node ? renderTitle(node) : (dataNode.title as string)
          }}
          treeData={treeData}
          onSelect={(keys) => {
            // allowClear 场景：再次点击已选中节点会清空，这里保持始终有选中。
            const next = keys[0]
            if (typeof next === 'string') onSelect(next)
          }}
        />
      )}
    </Card>
  )
}
