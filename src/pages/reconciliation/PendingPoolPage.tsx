import { useState } from 'react'
import { Alert, Button, Card, Spin, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import {
  ReconciliationPoolFilterBar,
  type ReconciliationPoolFilters,
} from '@/features/reconciliation/components/ReconciliationPoolFilterBar'
import { ReconciliationPoolTable } from '@/features/reconciliation/components/ReconciliationPoolTable'
import { useReconciliationPool } from '@/features/reconciliation/hooks'
import type { ReconciliationPoolRecord } from '@/features/reconciliation/types'

/**
 * 待对账单据池页面：已收货且未被任何对账单纳入的收货单在这里等待发起对账。
 * 单行或批量勾选「发起对账」→ 跳转对账列表新建视图并深链勾选单据
 * （?action=create&receipts=…&supplier=…；批量已在表格内完成单供应商校验）。
 */
export default function PendingPoolPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ReconciliationPoolFilters>({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  const { data, isLoading, isFetching, error, refetch } = useReconciliationPool({
    ...filters,
    ...pagination,
  })

  const handleSearch = (next: ReconciliationPoolFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  /** 携带勾选单据跳转对账列表的新建视图（单据 id 逗号拼接 + 供应商预置）。 */
  const launchReconciliation = (records: ReconciliationPoolRecord[]) => {
    const receiptIds = records.map((row) => row.receiptId).join(',')
    const supplierId = records[0]?.supplierId
    navigate(
      `${routeMeta.reconciliationList.path}?action=create&receipts=${encodeURIComponent(receiptIds)}${
        supplierId ? `&supplier=${encodeURIComponent(supplierId)}` : ''
      }`,
    )
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {routeMeta.reconciliationPendingPool.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {routeMeta.reconciliationPendingPool.description}
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
          刷新
        </Button>
      </div>
      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="已收货的采购单据自动进入待对账单据池，确认收货即产生应付款"
        description="勾选同一供应商的单据（整单纳入）后点「批量发起对账」，或对单张单据直接发起；已进入对账单（含草稿）的单据不再出现在池中。"
      />
      {error ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message="单据池加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <ReconciliationPoolFilterBar onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="待对账单据池加载中">
            <Spin size="large" />
          </div>
        ) : (
          <ReconciliationPoolTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onLaunch={(record) => launchReconciliation([record])}
            onBulkLaunch={launchReconciliation}
          />
        )}
      </Card>
    </>
  )
}
