import { useState } from 'react'
import { Alert, Button, Card, Space, Spin, Tabs, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { ReceiptConfirmView } from '@/features/receiving/components/ReceiptConfirmView'
import { ReceiptDetailView } from '@/features/receiving/components/ReceiptDetailView'
import { ReceiptFilterBar, type ReceiptFilters } from '@/features/receiving/components/ReceiptFilterBar'
import { ReceiptTable } from '@/features/receiving/components/ReceiptTable'
import { useReceipts } from '@/features/receiving/hooks/useReceivingQueries'
import type { ReceiptStatus } from '@/features/receiving/types'

/**
 * 收货单页面：待收货工作台 + 已收货台账（状态由页签承载，视图态由 URL 查询参数驱动）。
 * 「确认收货」进入页内确认视图（?action=confirm&id=…，刷新不丢视图）；
 * 详情视图（?action=detail&id=…）可从列表行、采购订单详情关联单据深链进入。
 */

/** 状态页签：全部 / 待收货 / 已收货（与收货单状态字典同口径）。 */
const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待收货' },
  { key: 'received', label: '已收货' },
]

/** 判断 URL 上的 status 参数是否为合法的收货单状态。 */
function isReceiptStatus(value: string | null): value is ReceiptStatus {
  return value === 'pending' || value === 'received'
}

export default function ReceiptPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // 视图态：?action=confirm&id=…（确认收货）/ ?action=detail&id=…（详情）。
  const confirmId = searchParams.get('action') === 'confirm' ? (searchParams.get('id') ?? undefined) : undefined
  const detailId = searchParams.get('action') === 'detail' ? (searchParams.get('id') ?? undefined) : undefined
  const initialStatus = searchParams.get('status')

  const [filters, setFilters] = useState<ReceiptFilters>({})
  const [status, setStatus] = useState<ReceiptStatus | 'all'>(isReceiptStatus(initialStatus) ? initialStatus : 'all')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  const { data, isLoading, isFetching, error, refetch } = useReceipts({
    ...filters,
    ...(status === 'all' ? {} : { status }),
    ...pagination,
  })

  /** 状态页签变化回到第一页，并同步到 URL 便于刷新与回退保持视图。 */
  const handleStatusChange = (key: string) => {
    setStatus(key as ReceiptStatus | 'all')
    setPagination((prev) => ({ ...prev, current: 1 }))
    const next = new URLSearchParams(searchParams)
    if (key === 'all') next.delete('status')
    else next.set('status', key)
    setSearchParams(next, { replace: true })
  }

  const handleSearch = (next: ReceiptFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  if (confirmId) {
    return (
      <ReceiptConfirmView
        key={confirmId}
        id={confirmId}
        onCancel={() => setSearchParams({}, { replace: true })}
        onConfirmed={() => setSearchParams({ status: 'received' }, { replace: true })}
      />
    )
  }
  if (detailId) {
    return (
      <ReceiptDetailView
        id={detailId}
        onBack={() => setSearchParams({}, { replace: true })}
        onInspect={(inspectionId) =>
          navigate(`${routeMeta.receivingInspection.path}?action=inspect&id=${inspectionId}`)
        }
      />
    )
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {routeMeta.receivingReceipt.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {routeMeta.receivingReceipt.description}
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
            刷新
          </Button>
        </Space>
      </div>
      {error ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message="收货单列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <ReceiptFilterBar onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        <Tabs activeKey={status} onChange={handleStatusChange} items={STATUS_TABS} />
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="收货单列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <ReceiptTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onView={(record) => setSearchParams({ action: 'detail', id: record.id })}
            onConfirm={(record) => setSearchParams({ action: 'confirm', id: record.id })}
            onInspect={(record) =>
              navigate(`${routeMeta.receivingInspection.path}?action=inspect&id=${record.inspectionId}`)
            }
          />
        )}
      </Card>
    </>
  )
}
