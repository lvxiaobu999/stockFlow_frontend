import { useState } from 'react'
import { Alert, App, Button, Card, Space, Spin } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { routeMeta } from '@/config/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { WarehouseFilterBar, type WarehouseFilters } from '@/features/inventory/components/WarehouseFilterBar'
import { WarehouseFormView } from '@/features/inventory/components/WarehouseFormView'
import { WarehouseTable } from '@/features/inventory/components/WarehouseTable'
import { useWarehouseMutations } from '@/features/inventory/hooks/useWarehouseMutations'
import { useWarehouses } from '@/features/inventory/hooks/useWarehouses'
import type { WarehouseRecord } from '@/features/inventory/types'

/** 页内视图态：列表 / 表单（id 缺省为新建）。 */
type WarehouseView = { mode: 'list' } | { mode: 'form'; id?: string }

/**
 * 仓库列表页：列表 + 表单两态页内切换。
 * 仓库无详情页（字段少，表格即全貌）；总仓停用由后端 4403 与前端隐藏入口双重兜底。
 */
export default function WarehouseListPage() {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const [view, setView] = useState<WarehouseView>({ mode: 'list' })
  const [filters, setFilters] = useState<WarehouseFilters>({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  const { data, isLoading, isFetching, error, refetch } = useWarehouses({ ...filters, ...pagination })
  const { toggleStatus } = useWarehouseMutations()
  const editingRecord =
    view.mode === 'form' && view.id ? (data?.lists.find((item) => item.id === view.id) ?? null) : null

  // 筛选条件变化时回到第一页，避免停留在已不存在的页码上。
  const handleSearch = (next: WarehouseFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  /** 停用 / 启用仓库。总仓入口已隐藏，此处仅兜底后端 4403 错误文案。 */
  const handleToggleStatus = (record: WarehouseRecord) => {
    const nextStatus = record.status === 1 ? 0 : 1
    toggleStatus.mutate(
      { id: record.id, status: nextStatus },
      {
        onSuccess: () => message.success(`仓库 ${record.name} 已${nextStatus === 1 ? '启用' : '停用'}`),
        onError: (error) => message.error(error.message),
      },
    )
  }

  if (view.mode === 'form') {
    return (
      <WarehouseFormView
        key={view.id ?? 'create'}
        warehouse={editingRecord}
        onCancel={() => setView({ mode: 'list' })}
        onSaved={() => setView({ mode: 'list' })}
      />
    )
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title={routeMeta.warehouse.title}
        description={routeMeta.warehouse.description}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
              刷新
            </Button>
            {has('inventory:warehouse:create') ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setView({ mode: 'form' })}>
                新建仓库
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
          message="仓库列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <WarehouseFilterBar onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="仓库列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <WarehouseTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onEdit={(record) => setView({ mode: 'form', id: record.id })}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </Card>
    </div>
  )
}
