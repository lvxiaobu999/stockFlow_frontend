import { useState } from 'react'
import { Alert, App, Button, Card, Space, Spin, Tabs } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { routeMeta } from '@/config/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { PurchaseRequestDetailView } from '@/features/purchase/components/PurchaseRequestDetailView'
import {
  PurchaseRequestFilterBar,
  type PurchaseRequestFilters,
} from '@/features/purchase/components/PurchaseRequestFilterBar'
import { PurchaseRequestFormView } from '@/features/purchase/components/PurchaseRequestFormView'
import { PurchaseRequestTable } from '@/features/purchase/components/PurchaseRequestTable'
import { usePurchaseRequestDetail, usePurchaseRequests } from '@/features/purchase/hooks/usePurchaseRequests'
import { usePurchaseRequestMutations } from '@/features/purchase/hooks/usePurchaseRequestMutations'
import {
  PURCHASE_REQUEST_STATUS_META,
  type PurchaseRequestRecord,
  type PurchaseRequestStatus,
} from '@/features/purchase/types'

/** 页内视图态：列表 / 新建 / 编辑 / 详情。 */
type PurchaseRequestView =
  { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; id: string } | { mode: 'detail'; id: string }

/** 状态页签：全部 + 五个状态（原型同时有页签与状态下拉，取页签去重）。 */
const STATUS_TABS = [
  { key: 'all', label: '全部' },
  ...(Object.keys(PURCHASE_REQUEST_STATUS_META) as PurchaseRequestStatus[]).map((status) => ({
    key: status,
    label: PURCHASE_REQUEST_STATUS_META[status].label,
  })),
]

interface PurchaseRequestEditViewProps {
  id: string
  onCancel: () => void
  onSaved: () => void
}

/** 编辑视图容器：编辑目标不一定在当前列表缓存页，统一走详情接口取完整单据再进表单。 */
function PurchaseRequestEditView({ id, onCancel, onSaved }: PurchaseRequestEditViewProps) {
  const { data, isLoading, error } = usePurchaseRequestDetail(id)
  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="采购申请编辑加载中">
          <Spin size="large" />
        </div>
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="dashboard-page">
        <Alert
          type="error"
          showIcon
          message="采购申请加载失败"
          description={error?.message ?? '申请不存在或已被移除'}
          action={<Button onClick={onCancel}>返回列表</Button>}
        />
      </div>
    )
  }
  return <PurchaseRequestFormView key={id} request={data} onCancel={onCancel} onSaved={onSaved} />
}

/**
 * 采购申请页面：列表 / 表单 / 详情四态页内切换（与供应商页同模式）。
 * 列表状态筛选由页签承载并联动分页复位；生成订单 / 查看订单是
 * 采购订单模块的前置动作，订单模块上线前统一提示占位。
 */
export default function PurchaseRequestPage() {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const [view, setView] = useState<PurchaseRequestView>({ mode: 'list' })
  const [filters, setFilters] = useState<PurchaseRequestFilters>({})
  const [status, setStatus] = useState<PurchaseRequestStatus | 'all'>('all')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  const { data, isLoading, isFetching, error, refetch } = usePurchaseRequests({
    ...filters,
    ...(status === 'all' ? {} : { status }),
    ...pagination,
  })
  const { submit, withdraw, remove } = usePurchaseRequestMutations()

  // 筛选 / 页签变化都回到第一页，避免停留在已不存在的页码上。
  const handleSearch = (next: PurchaseRequestFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }
  const handleStatusChange = (key: string) => {
    setStatus(key as PurchaseRequestStatus | 'all')
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  /** 生成订单 / 查看订单：采购订单模块上线前的占位提示。 */
  const handleOrderPlaceholder = (record: PurchaseRequestRecord) => {
    message.info(`采购订单模块尚未上线，请先通过采购申请 ${record.code} 跟踪进度`)
  }

  // ── 表单 / 详情视图 ────────────────────────────────────────────────
  if (view.mode === 'create') {
    return (
      <PurchaseRequestFormView
        key="create"
        request={null}
        onCancel={() => setView({ mode: 'list' })}
        onSaved={() => setView({ mode: 'list' })}
      />
    )
  }
  if (view.mode === 'edit') {
    return (
      <PurchaseRequestEditView
        id={view.id}
        onCancel={() => setView({ mode: 'list' })}
        onSaved={() => setView({ mode: 'list' })}
      />
    )
  }
  if (view.mode === 'detail') {
    return (
      <PurchaseRequestDetailView
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
        title={routeMeta.purchaseRequest.title}
        description={routeMeta.purchaseRequest.description}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
              刷新
            </Button>
            {has('purchase:request:create') ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setView({ mode: 'create' })}>
                新建采购申请
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
          message="采购申请列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <PurchaseRequestFilterBar onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        <Tabs activeKey={status} onChange={handleStatusChange} items={STATUS_TABS} />
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="采购申请列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <PurchaseRequestTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onView={(record) => setView({ mode: 'detail', id: record.id })}
            onEdit={(record) => setView({ mode: 'edit', id: record.id })}
            onSubmit={(record) =>
              submit.mutate(record.id, {
                onSuccess: (saved) => message.success(`采购申请 ${saved.code} 已提交审批`),
                onError: (mutationError) => message.error(mutationError.message),
              })
            }
            onWithdraw={(record) =>
              withdraw.mutate(record.id, {
                onSuccess: (saved) => message.success(`采购申请 ${saved.code} 已撤回`),
                onError: (mutationError) => message.error(mutationError.message),
              })
            }
            onDelete={(record) =>
              remove.mutate(record.id, {
                onSuccess: () => message.success(`采购申请 ${record.code} 已删除`),
                onError: (mutationError) => message.error(mutationError.message),
              })
            }
            onGenerateOrder={handleOrderPlaceholder}
            onViewOrder={handleOrderPlaceholder}
          />
        )}
      </Card>
    </div>
  )
}
