import { useState } from 'react'
import { App, Alert, Button, Card, Space, Spin } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { routeMeta } from '@/config/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { UserFilterBar, type UserFilters } from '@/features/system/components/user/UserFilterBar'
import { UserFormDrawer } from '@/features/system/components/user/UserFormDrawer'
import { UserTable } from '@/features/system/components/user/UserTable'
import { useRoleOptions } from '@/features/system/hooks/useRoles'
import { useUserMutations } from '@/features/system/hooks/useUserMutations'
import { useUsers } from '@/features/system/hooks/useUsers'
import type { UserRecord } from '@/features/system/types'

/**
 * 用户管理页：筛选栏 + 用户表格 + 新建/编辑抽屉的薄组合层。
 * 数据获取与 mutation 全部来自 features/system 的 hooks，这里只负责装配与状态编排。
 */
export default function UserManagementPage() {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const canCreate = has('system:user:create')

  const [filters, setFilters] = useState<UserFilters>({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)

  const { data, isLoading, isFetching, error, refetch } = useUsers({ ...filters, ...pagination })
  const { data: roleOptions } = useRoleOptions()
  const { resetPassword, toggleStatus } = useUserMutations()

  // 筛选条件变化时回到第一页，避免停留在已不存在的页码上。
  const handleSearch = (next: UserFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleResetPassword = (user: UserRecord) => {
    resetPassword.mutate(
      { id: user.id },
      {
        onSuccess: () => message.success(`已重置 ${user.name} 的密码，请通知用户使用新密码登录`),
        onError: (error) => message.error(error.message),
      },
    )
  }

  const handleToggleStatus = (user: UserRecord) => {
    const nextStatus = user.status === 1 ? 0 : 1
    toggleStatus.mutate(
      { id: user.id, status: nextStatus },
      {
        onSuccess: () => message.success(`账号 ${user.username} 已${nextStatus === 1 ? '启用' : '停用'}`),
        onError: (error) => message.error(error.message),
      },
    )
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title={routeMeta.systemUser.title}
        description={routeMeta.systemUser.description}
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
                  setEditingUser(null)
                  setDrawerOpen(true)
                }}
              >
                新建用户
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
          message="用户列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <UserFilterBar roles={roleOptions ?? []} onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="用户列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <UserTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onEdit={(user) => {
              setEditingUser(user)
              setDrawerOpen(true)
            }}
            onResetPassword={handleResetPassword}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </Card>
      <UserFormDrawer open={drawerOpen} user={editingUser} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
