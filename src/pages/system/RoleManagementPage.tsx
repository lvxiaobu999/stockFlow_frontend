import { useState } from 'react'
import { App, Alert, Button, Card, Space, Spin } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { routeMeta } from '@/config/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { RoleFilterBar, type RoleFilters } from '@/features/system/components/role/RoleFilterBar'
import { RoleFormModal } from '@/features/system/components/role/RoleFormModal'
import { RolePermissionModal } from '@/features/system/components/role/RolePermissionModal'
import { RoleTable } from '@/features/system/components/role/RoleTable'
import { useRoleMutations } from '@/features/system/hooks/useRoleMutations'
import { useRoles } from '@/features/system/hooks/useRoles'
import type { RoleRecord } from '@/features/system/types'

/**
 * 角色管理页：筛选、列表与「新建/编辑」「配置权限」两个弹窗的薄组合层。
 * 权限配置不跳独立页面，弹窗关闭后列表的筛选与分页现场原样保留。
 */
export default function RoleManagementPage() {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const canCreate = has('system:role:create')

  const [filters, setFilters] = useState<RoleFilters>({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null)
  /** 非空时打开该角色的权限配置弹窗。 */
  const [configuringRole, setConfiguringRole] = useState<RoleRecord | null>(null)

  const { data, isLoading, isFetching, error, refetch } = useRoles({ ...filters, ...pagination })
  const { toggleStatus } = useRoleMutations()

  const handleToggleStatus = (role: RoleRecord) => {
    const nextStatus = role.status === 1 ? 0 : 1
    toggleStatus.mutate(
      { id: role.id, status: nextStatus },
      {
        onSuccess: () => message.success(`角色 ${role.name} 已${nextStatus === 1 ? '启用' : '停用'}`),
        onError: (error) => message.error(error.message),
      },
    )
  }

  // 权限配置采用弹窗而非独立页面：列表的筛选与分页状态在弹窗关闭后原样保留。
  // key 绑定角色 id：切换角色时重置弹窗内的勾选/展开状态，避免残留上一个角色的覆盖值。
  return (
    <div className="dashboard-page">
      <PageHeader
        title={routeMeta.systemRole.title}
        description={routeMeta.systemRole.description}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
              刷新
            </Button>
            {canCreate ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingRole(null)
                  setModalOpen(true)
                }}
              >
                新建角色
              </Button>
            ) : null}
          </Space>
        }
      />
      {error ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message="角色列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <RoleFilterBar
        onSearch={(next) => {
          setFilters(next)
          setPagination((prev) => ({ ...prev, current: 1 }))
        }}
      />
      <Card size="small" className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="角色列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <RoleTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onEdit={(role) => {
              setEditingRole(role)
              setModalOpen(true)
            }}
            onConfigure={(role) => setConfiguringRole(role)}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </Card>
      <RoleFormModal open={modalOpen} role={editingRole} onClose={() => setModalOpen(false)} />
      <RolePermissionModal
        key={configuringRole?.id ?? 'none'}
        open={configuringRole !== null}
        role={configuringRole}
        onClose={() => setConfiguringRole(null)}
      />
    </div>
  )
}
