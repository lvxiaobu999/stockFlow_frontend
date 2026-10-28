import { useState } from 'react'
import { Alert, Button, Card, Space, Spin, Tabs, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { ConfirmOrderModal } from '@/features/supplier-portal/components/ConfirmOrderModal'
import { PortalOrderDetailView } from '@/features/supplier-portal/components/PortalOrderDetailView'
import {
  PortalOrderFilterBar,
  type PortalOrderFilters,
} from '@/features/supplier-portal/components/PortalOrderFilterBar'
import { PortalOrderTable } from '@/features/supplier-portal/components/PortalOrderTable'
import { RejectOrderModal } from '@/features/supplier-portal/components/RejectOrderModal'
import { usePortalOrders } from '@/features/supplier-portal/hooks/usePortalQueries'
import {
  PURCHASE_ORDER_STATUS_META,
  type PurchaseOrderRecord,
  type PurchaseOrderStatus,
} from '@/features/supplier-portal/types'

/**
 * 我的采购订单页面：列表 / 详情页内切换（视图态由 URL 查询参数驱动）。
 * 门户首页的「去处理」与列表行的「确认 / 拒绝 / 去发货」共用同一套入口；
 * 支持从首页深链预置状态页签（?status=pending_supplier）。
 */

/** 状态页签：全部 + 九个状态（与管理端订单列表同口径，页签去重状态下拉）。 */
const STATUS_TABS = [
  { key: 'all', label: '全部' },
  ...(Object.keys(PURCHASE_ORDER_STATUS_META) as PurchaseOrderStatus[]).map((status) => ({
    key: status,
    label: PURCHASE_ORDER_STATUS_META[status].label,
  })),
]

/** 判断 URL 上的 status 参数是否为合法的订单状态（用于页签深链预置）。 */
function isOrderStatus(value: string | null): value is PurchaseOrderStatus {
  return value !== null && value in PURCHASE_ORDER_STATUS_META
}

export default function MyOrdersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // 详情视图：?action=detail&id=…；status 参数作为列表页签的深链预置。
  const detailId = searchParams.get('action') === 'detail' ? (searchParams.get('id') ?? undefined) : undefined
  const initialStatus = searchParams.get('status')

  const [filters, setFilters] = useState<PortalOrderFilters>({})
  const [status, setStatus] = useState<PurchaseOrderStatus | 'all'>(
    isOrderStatus(initialStatus) ? initialStatus : 'all',
  )
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  // 列表行确认 / 拒绝的弹窗目标（详情页的弹窗在 DetailView 内部）。
  const [confirmTarget, setConfirmTarget] = useState<PurchaseOrderRecord | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PurchaseOrderRecord | null>(null)

  const { data, isLoading, isFetching, error, refetch } = usePortalOrders({
    ...filters,
    ...(status === 'all' ? {} : { status }),
    ...pagination,
  })

  /** 状态页签变化回到第一页，并同步到 URL 便于刷新与回退保持视图。 */
  const handleStatusChange = (key: string) => {
    setStatus(key as PurchaseOrderStatus | 'all')
    setPagination((prev) => ({ ...prev, current: 1 }))
    const next = new URLSearchParams(searchParams)
    if (key === 'all') next.delete('status')
    else next.set('status', key)
    setSearchParams(next, { replace: true })
  }

  const handleSearch = (next: PortalOrderFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  if (detailId) {
    return (
      <PortalOrderDetailView
        id={detailId}
        onBack={() => setSearchParams({}, { replace: true })}
        onShip={() => navigate(`${routeMeta.supplierPortalToShip.path}?action=ship&id=${detailId}`)}
      />
    )
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {routeMeta.supplierPortalMyOrders.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {routeMeta.supplierPortalMyOrders.description}
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
          message="订单列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <PortalOrderFilterBar onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        <Tabs activeKey={status} onChange={handleStatusChange} items={STATUS_TABS} />
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="我的采购订单加载中">
            <Spin size="large" />
          </div>
        ) : (
          <PortalOrderTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onView={(record) => setSearchParams({ action: 'detail', id: record.id })}
            onConfirm={(record) => setConfirmTarget(record)}
            onReject={(record) => setRejectTarget(record)}
            onShip={(record) => navigate(`${routeMeta.supplierPortalToShip.path}?action=ship&id=${record.id}`)}
          />
        )}
      </Card>

      <ConfirmOrderModal order={confirmTarget} onClose={() => setConfirmTarget(null)} />
      <RejectOrderModal order={rejectTarget} onClose={() => setRejectTarget(null)} />
    </>
  )
}
