import { useMemo, useState } from 'react'
import { App, Button, Modal, Space, Spin, Tag, Tree, Typography } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { useRoleMutations } from '@/features/system/hooks/useRoleMutations'
import { usePermissionTree, useRolePermissions } from '@/features/system/hooks/useRoles'
import type { PermissionNode, RoleRecord } from '@/features/system/types'

interface RolePermissionModalProps {
  open: boolean
  /** 配置目标；关闭时为 null。 */
  role: RoleRecord | null
  onClose: () => void
}

/** 分组伪权限码前缀：仅用于树结构展示，保存时不上送（后端同样会过滤）。 */
const GROUP_KEY_PREFIX = 'group:'

/** 树体滚动区最大高度，超出后内部滚动，弹窗整体高度保持稳定。 */
const TREE_MAX_HEIGHT = 400

/** 递归收集叶子节点 key（菜单叶子 + 按钮节点），供「全选」与 admin '*' 回显使用。 */
function collectLeafKeys(nodes: PermissionNode[]): string[] {
  const keys: string[] = []
  for (const node of nodes) {
    if (node.children?.length) {
      keys.push(...collectLeafKeys(node.children))
    } else {
      keys.push(node.key)
    }
  }
  return keys
}

/** 递归收集全部节点 key，供「展开全部」使用。 */
function collectAllKeys(nodes: PermissionNode[]): string[] {
  const keys: string[] = []
  for (const node of nodes) {
    keys.push(node.key)
    if (node.children?.length) keys.push(...collectAllKeys(node.children))
  }
  return keys
}

/** 按钮节点用 Tag 弱化呈现，与菜单标题区分层级。 */
function toTreeData(nodes: PermissionNode[]): DataNode[] {
  return nodes.map((node) => ({
    key: node.key,
    title: node.type === 'button' ? <Tag className="mr-0">{node.title}</Tag> : node.title,
    children: node.children ? toTreeData(node.children) : undefined,
  }))
}

/**
 * 角色权限配置弹窗：权限树勾选 → 保存提交。
 *
 * - admin 持 '*' 通配，回显为全选叶子；分组 group: 伪码仅用于树结构，保存前过滤；
 * - 勾选与展开采用「覆盖值优先」的派生模式（用户未操作时直接由服务端数据推导），
 *   避免在 effect 里同步 setState；
 * - 权限「下次登录生效」，保存成功后在提示语中明确告知。
 */
export function RolePermissionModal({ open, role, onClose }: RolePermissionModalProps) {
  const { message } = App.useApp()
  const { data: tree, isLoading: treeLoading } = usePermissionTree()
  const { data: savedCodes, isLoading: codesLoading } = useRolePermissions(role?.id ?? '')
  const { savePermissions } = useRoleMutations()

  const [checkedOverride, setCheckedOverride] = useState<string[] | null>(null)
  const [userExpandedKeys, setUserExpandedKeys] = useState<string[] | null>(null)
  const [expandAll, setExpandAll] = useState(true)

  const treeData = useMemo<DataNode[]>(() => (tree ? toTreeData(tree) : []), [tree])
  const leafKeys = useMemo(() => (tree ? collectLeafKeys(tree) : []), [tree])
  const allKeys = useMemo(() => (tree ? collectAllKeys(tree) : []), [tree])

  // 未手动勾选时由后端回传码推导初始勾选；'*' 通配展开为全选叶子。
  const checkedKeys = checkedOverride ?? (savedCodes?.includes('*') ? leafKeys : (savedCodes ?? []))
  // 默认展开全部分组，一屏可览，减少逐层点开的操作成本。
  const expandedKeys = userExpandedKeys ?? (expandAll ? allKeys : [])

  const selectedCount = checkedKeys.filter((key) => !key.startsWith(GROUP_KEY_PREFIX)).length
  const allSelected = leafKeys.length > 0 && checkedKeys.length >= leafKeys.length

  const handleSave = () => {
    if (!role) return
    savePermissions.mutate(
      {
        id: role.id,
        permissionCodes: checkedKeys.filter((key) => !key.startsWith(GROUP_KEY_PREFIX)),
      },
      {
        onSuccess: () => {
          message.success(`角色「${role.name}」的权限已保存，将在用户下次登录后生效`)
          onClose()
        },
        onError: (error) => message.error(error.message),
      },
    )
  }

  return (
    <Modal
      title={role ? `配置权限 · ${role.name}` : '配置权限'}
      width={640}
      open={open}
      onCancel={onClose}
      cancelText="取消"
      okText="保存权限"
      okButtonProps={{ disabled: !role }}
      confirmLoading={savePermissions.isPending}
      onOk={handleSave}
      destroyOnHidden
    >
      {role ? (
        <div className="pt-1">
          <Typography.Text type="secondary" className="!text-xs">
            编码 {role.code} · {role.userCount} 个用户使用中 · 保存后下次登录生效
          </Typography.Text>
          {role.code === 'admin' ? (
            <Typography.Paragraph type="secondary" className="!mt-2 !mb-3 !text-xs">
              管理员角色默认拥有全部权限（* 通配），已按全选回显。
            </Typography.Paragraph>
          ) : null}

          <div className="mb-2 flex items-center justify-between">
            <Typography.Text type="secondary" className="!text-xs">
              已选 {selectedCount} 项权限
            </Typography.Text>
            <Space size={4}>
              <Button
                type="text"
                size="small"
                className="!h-7 !px-2 !text-xs"
                onClick={() => {
                  setExpandAll((prev) => !prev)
                  setUserExpandedKeys(null)
                }}
              >
                {expandAll ? '收起全部' : '展开全部'}
              </Button>
              <Button
                type="text"
                size="small"
                className="!h-7 !px-2 !text-xs"
                onClick={() => setCheckedOverride(allSelected ? [] : leafKeys)}
              >
                {allSelected ? '取消全选' : '全选'}
              </Button>
            </Space>
          </div>

          <div
            className="rounded-md border border-slate-200 p-3"
            style={{ maxHeight: TREE_MAX_HEIGHT, overflowY: 'auto' }}
          >
            {treeLoading || codesLoading ? (
              <div className="grid h-48 place-items-center" role="status" aria-label="权限数据加载中">
                <Spin />
              </div>
            ) : (
              <Tree
                checkable
                blockNode
                expandedKeys={expandedKeys}
                onExpand={(keys) => {
                  // Key 联合了 number，统一收敛为 string 再入 state。
                  setUserExpandedKeys(keys.map(String))
                  setExpandAll(keys.length >= allKeys.length)
                }}
                checkedKeys={checkedKeys}
                onCheck={(checked) => {
                  // 非严格模式下 checked 为完整勾选数组，直接整组替换为覆盖值。
                  const next = Array.isArray(checked) ? checked : checked.checked
                  setCheckedOverride(next.map(String))
                }}
                treeData={treeData}
              />
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
