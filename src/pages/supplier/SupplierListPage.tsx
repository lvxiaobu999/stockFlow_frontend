import { useState } from 'react'
import { Alert, App, Button, Card, Space, Spin } from 'antd'
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { routeMeta } from '@/config/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { SupplierDetailView } from '@/features/supplier/components/SupplierDetailView'
import { SupplierFilterBar, type SupplierFilters } from '@/features/supplier/components/SupplierFilterBar'
import { SupplierFormView } from '@/features/supplier/components/SupplierFormView'
import { SupplierTable } from '@/features/supplier/components/SupplierTable'
import { useSupplierMutations } from '@/features/supplier/hooks/useSupplierMutations'
import { useSuppliers } from '@/features/supplier/hooks/useSuppliers'
import type { SupplierRecord } from '@/features/supplier/types'
import { downloadCsv } from '@/utils'

/** 页内视图态：列表 / 新建 / 编辑 / 详情。 */
type SupplierView =
  { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; id: string } | { mode: 'detail'; id: string }

/**
 * 供应商列表页：列表 / 表单 / 详情三态页内切换（与商品页同模式）。
 * 列表数据走 React Query 缓存，从表单或详情返回时缓存命中、不重新请求。
 */
export default function SupplierListPage() {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const [view, setView] = useState<SupplierView>({ mode: 'list' })
  const [filters, setFilters] = useState<SupplierFilters>({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  const { data, isLoading, isFetching, error, refetch } = useSuppliers({ ...filters, ...pagination })
  const { toggleStatus } = useSupplierMutations()
  // 编辑视图直接复用列表行数据（列表已含全部表单字段），避免二次请求。
  const editingRecord = view.mode === 'edit' ? (data?.lists.find((item) => item.id === view.id) ?? null) : null

  // 筛选条件变化时回到第一页，避免停留在已不存在的页码上。
  const handleSearch = (next: SupplierFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  /** 导出当前页 CSV（MVP 口径：只导出当前筛选 + 当前页数据）。 */
  const handleExport = () => {
    if (!data || data.lists.length === 0) {
      message.warning('当前页没有可导出的数据')
      return
    }
    const header = ['供应商编码', '供应商名称', '联系人', '联系电话', '邮箱', '在途订单', '累计采购额', '状态']
    const rows = data.lists.map((item) => [
      item.code,
      item.name,
      item.contactPerson,
      item.phone,
      item.email ?? '',
      item.pendingOrderCount,
      item.totalPurchaseAmount,
      item.status === 1 ? '启用' : '停用',
    ])
    downloadCsv(`供应商列表_${dayjs().format('YYYYMMDD_HHmm')}.csv`, header, rows)
    message.success('已导出当前页数据')
  }

  /** 停用 / 启用供应商。 */
  const handleToggleStatus = (record: SupplierRecord) => {
    const nextStatus = record.status === 1 ? 0 : 1
    toggleStatus.mutate(
      { id: record.id, status: nextStatus },
      {
        onSuccess: () => message.success(`供应商 ${record.name} 已${nextStatus === 1 ? '启用' : '停用'}`),
        onError: (error) => message.error(error.message),
      },
    )
  }

  // ── 表单 / 详情视图 ────────────────────────────────────────────────
  if (view.mode === 'create') {
    return (
      <SupplierFormView
        key="create"
        supplier={null}
        onCancel={() => setView({ mode: 'list' })}
        onSaved={() => setView({ mode: 'list' })}
      />
    )
  }
  if (view.mode === 'edit') {
    if (!editingRecord) {
      // 列表缓存被清时行数据暂缺，先回列表兜底。
      return (
        <SupplierFormView
          key="edit-missing"
          supplier={null}
          onCancel={() => setView({ mode: 'list' })}
          onSaved={() => setView({ mode: 'list' })}
        />
      )
    }
    return (
      <SupplierFormView
        key={view.id}
        supplier={editingRecord}
        onCancel={() => setView({ mode: 'list' })}
        onSaved={() => setView({ mode: 'list' })}
      />
    )
  }
  if (view.mode === 'detail') {
    return (
      <SupplierDetailView
        id={view.id}
        onBack={() => setView({ mode: 'list' })}
        onEdit={() => setView({ mode: 'edit', id: view.id })}
      />
    )
  }

  // ── 列表视图 ───────────────────────────────────────────────────────
  return (
    <div className="dashboard-page">
      <PageHeader
        title={routeMeta.supplierList.title}
        description={routeMeta.supplierList.description}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
              刷新
            </Button>
            {has('supplier:list:export') ? (
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
            ) : null}
            {has('supplier:list:create') ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setView({ mode: 'create' })}>
                新建供应商
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
          message="供应商列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <SupplierFilterBar onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="供应商列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <SupplierTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onView={(record) => setView({ mode: 'detail', id: record.id })}
            onEdit={(record) => setView({ mode: 'edit', id: record.id })}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </Card>
    </div>
  )
}
