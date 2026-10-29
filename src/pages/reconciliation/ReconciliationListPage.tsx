import { useState } from 'react'
import { Alert, App, Button, Card, Space, Spin, Typography } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import {
  ReconciliationFilterBar,
  type ReconciliationFilters,
} from '@/features/reconciliation/components/ReconciliationFilterBar'
import { ReconciliationTable } from '@/features/reconciliation/components/ReconciliationTable'
import { ReconciliationDetailView } from '@/features/reconciliation/components/ReconciliationDetailView'
import { ReconciliationConfirmView } from '@/features/reconciliation/components/ReconciliationConfirmView'
import { ReconciliationFormView } from '@/features/reconciliation/components/ReconciliationFormView'
import { useReconciliations, useReconciliationMutations } from '@/features/reconciliation/hooks'
import { usePermissions } from '@/features/auth/hooks/usePermissions'

/**
 * 对账列表页面：对账单台账（视图态由 URL 查询参数驱动，刷新不丢视图）。
 * - ?action=create[&receipts=…&supplier=…]：新建（可从单据池深链带勾选单据进入）；
 * - ?action=edit&id=…：编辑草稿；?action=detail&id=…：详情；
 * - ?action=confirm&id=…：确认 / 差异处理。
 */
export default function ReconciliationListPage() {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const { submitReconciliation, closeReconciliation } = useReconciliationMutations()

  const action = searchParams.get('action')
  const viewId =
    action === 'edit' || action === 'detail' || action === 'confirm' ? (searchParams.get('id') ?? undefined) : undefined
  const deepLinkReceipts = searchParams.get('receipts')?.split(',').filter(Boolean) ?? []
  const deepLinkSupplierId = searchParams.get('supplier') ?? undefined

  const [filters, setFilters] = useState<ReconciliationFilters>({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  const { data, isLoading, isFetching, error, refetch } = useReconciliations({
    ...filters,
    ...pagination,
  })

  const handleSearch = (next: ReconciliationFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const backToList = () => setSearchParams({}, { replace: true })

  /** 列表内直接提交草稿。 */
  const handleSubmitDraft = (record: { id: string; code: string }) => {
    submitReconciliation.mutate(
      { id: record.id },
      {
        onSuccess: () => message.success(`对账单 ${record.code} 已提交，等待财务确认`),
        onError: (mutationError) => message.error(mutationError.message),
      },
    )
  }

  /** 列表内直接关闭已确认单。 */
  const handleCloseConfirmed = (record: { id: string; code: string }) => {
    closeReconciliation.mutate(
      { id: record.id },
      {
        onSuccess: () => message.success(`对账单 ${record.code} 已关闭`),
        onError: (mutationError) => message.error(mutationError.message),
      },
    )
  }

  // ── 视图态：新建 / 编辑 ───────────────────────────────────────────
  if (action === 'create' || action === 'edit') {
    return (
      <ReconciliationFormView
        key={viewId ?? 'create'}
        editId={action === 'edit' ? viewId : undefined}
        initialReceiptIds={action === 'create' && deepLinkReceipts.length ? deepLinkReceipts : undefined}
        initialSupplierId={action === 'create' ? deepLinkSupplierId : undefined}
        onCancel={backToList}
        onSaved={(code, submitted) => {
          message.success(submitted ? `对账单 ${code} 已生成并提交，等待财务确认` : `对账单 ${code} 已保存为草稿`)
          setSearchParams({}, { replace: true })
        }}
      />
    )
  }
  // ── 视图态：详情 ─────────────────────────────────────────────────
  if (action === 'detail' && viewId) {
    return (
      <ReconciliationDetailView
        key={viewId}
        id={viewId}
        onBack={backToList}
        onConfirm={(recordId) => setSearchParams({ action: 'confirm', id: recordId }, { replace: true })}
        onEdit={(recordId) => setSearchParams({ action: 'edit', id: recordId }, { replace: true })}
      />
    )
  }
  // ── 视图态：确认 / 差异处理 ──────────────────────────────────────
  if (action === 'confirm' && viewId) {
    return <ReconciliationConfirmView key={viewId} id={viewId} onCancel={backToList} onDone={backToList} />
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {routeMeta.reconciliationList.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {routeMeta.reconciliationList.description}
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!has('reconciliation:list:create')}
            onClick={() => setSearchParams({ action: 'create' })}
          >
            新建对账
          </Button>
        </Space>
      </div>
      {error ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message="对账单列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <ReconciliationFilterBar onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="对账单列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <ReconciliationTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onView={(record) => setSearchParams({ action: 'detail', id: record.id })}
            onEdit={(record) => setSearchParams({ action: 'edit', id: record.id })}
            onConfirm={(record) => setSearchParams({ action: 'confirm', id: record.id })}
            onSubmit={handleSubmitDraft}
            onClose={handleCloseConfirmed}
          />
        )}
      </Card>
    </>
  )
}
