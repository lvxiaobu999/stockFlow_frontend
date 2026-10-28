import { useState } from 'react'
import { Alert, App, Button, Card, Form, Input, Modal, Space, Spin, Tabs } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { PurchaseOrderDetailView } from '@/features/purchase/components/PurchaseOrderDetailView'
import {
  PurchaseOrderFilterBar,
  type PurchaseOrderFilters,
} from '@/features/purchase/components/PurchaseOrderFilterBar'
import { PurchaseOrderFormView } from '@/features/purchase/components/PurchaseOrderFormView'
import { PurchaseOrderTable } from '@/features/purchase/components/PurchaseOrderTable'
import { usePurchaseOrderDetail, usePurchaseOrders } from '@/features/purchase/hooks/usePurchaseOrders'
import { usePurchaseOrderMutations } from '@/features/purchase/hooks/usePurchaseOrderMutations'
import { usePurchaseRequestDetail } from '@/features/purchase/hooks/usePurchaseRequests'
import {
  PURCHASE_ORDER_STATUS_META,
  type PurchaseOrderRecord,
  type PurchaseOrderStatus,
} from '@/features/purchase/types'

/**
 * 页内视图态由 URL 查询参数驱动（而非组件内 state）：
 * 采购申请列表的「生成订单 / 查看订单」会深链跳入本页
 * （/purchase/order?action=create&fromRequest=…、?action=detail&id=…），
 * 参数驱动让跨页跳转与页内切换共用同一套入口，且刷新不丢视图。
 */
type OrderView =
  | { mode: 'list' }
  | { mode: 'create'; fromRequestId?: string }
  | { mode: 'edit'; id: string }
  | { mode: 'detail'; id: string }

function parseView(searchParams: URLSearchParams): OrderView {
  const action = searchParams.get('action')
  const id = searchParams.get('id') ?? undefined
  if (action === 'create') return { mode: 'create', fromRequestId: searchParams.get('fromRequest') ?? undefined }
  if (action === 'edit' && id) return { mode: 'edit', id }
  if (action === 'detail' && id) return { mode: 'detail', id }
  return { mode: 'list' }
}

/** 状态页签：全部 + 九个状态（与采购申请列表同口径，页签去重状态下拉）。 */
const STATUS_TABS = [
  { key: 'all', label: '全部' },
  ...(Object.keys(PURCHASE_ORDER_STATUS_META) as PurchaseOrderStatus[]).map((status) => ({
    key: status,
    label: PURCHASE_ORDER_STATUS_META[status].label,
  })),
]

interface OrderEditViewProps {
  id: string
  onCancel: () => void
  onSaved: () => void
}

/** 编辑视图容器：编辑目标不一定在当前列表缓存页，统一走详情接口取完整单据再进表单。 */
function OrderEditView({ id, onCancel, onSaved }: OrderEditViewProps) {
  const { data, isLoading, error } = usePurchaseOrderDetail(id)
  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="采购订单编辑加载中">
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
          message="采购订单加载失败"
          description={error?.message ?? '订单不存在或已被移除'}
          action={<Button onClick={onCancel}>返回列表</Button>}
        />
      </div>
    )
  }
  return <PurchaseOrderFormView key={id} order={data} onCancel={onCancel} onSaved={onSaved} />
}

interface OrderCreateFromRequestViewProps {
  requestId: string
  onCancel: () => void
  onSaved: () => void
}

/** 从申请生成的创建容器：先取申请详情（明细带入表单），失败时给出可返回的错误态。 */
function OrderCreateFromRequestView({ requestId, onCancel, onSaved }: OrderCreateFromRequestViewProps) {
  const { data, isLoading, error } = usePurchaseRequestDetail(requestId)
  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="来源申请加载中">
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
          message="来源采购申请加载失败"
          description={error?.message ?? '申请不存在或已被移除'}
          action={<Button onClick={onCancel}>返回列表</Button>}
        />
      </div>
    )
  }
  return <PurchaseOrderFormView key="create" order={null} sourceRequest={data} onCancel={onCancel} onSaved={onSaved} />
}

/**
 * 采购订单页面：列表 / 表单 / 详情四态页内切换（视图态由 URL 参数驱动）。
 * 列表状态筛选由页签承载并联动分页复位；作废动作在列表与详情都可发起，
 * 原因必填，统一用页内的作废弹窗收集。
 */
export default function PurchaseOrderPage() {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = parseView(searchParams)
  const [filters, setFilters] = useState<PurchaseOrderFilters>({})
  const [status, setStatus] = useState<PurchaseOrderStatus | 'all'>('all')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  // 列表行作废的弹窗状态（详情页的作废弹窗在 DetailView 内部）。
  const [voidTarget, setVoidTarget] = useState<PurchaseOrderRecord | null>(null)
  const [voidForm] = Form.useForm<{ reason: string }>()

  const { data, isLoading, isFetching, error, refetch } = usePurchaseOrders({
    ...filters,
    ...(status === 'all' ? {} : { status }),
    ...pagination,
  })
  const { remove, send, voidOrder } = usePurchaseOrderMutations()

  /** 视图切换统一走查询参数，保证深链入口与页内切换行为一致。 */
  const switchView = (next: OrderView) => {
    switch (next.mode) {
      case 'create':
        setSearchParams(
          next.fromRequestId ? { action: 'create', fromRequest: next.fromRequestId } : { action: 'create' },
        )
        break
      case 'edit':
        setSearchParams({ action: 'edit', id: next.id })
        break
      case 'detail':
        setSearchParams({ action: 'detail', id: next.id })
        break
      default:
        setSearchParams({})
    }
  }

  // 筛选 / 页签变化都回到第一页，避免停留在已不存在的页码上。
  const handleSearch = (next: PurchaseOrderFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }
  const handleStatusChange = (key: string) => {
    setStatus(key as PurchaseOrderStatus | 'all')
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  /** 提交作废（列表行入口）；原因必填，成功后弹窗关闭、列表随失效刷新。 */
  const handleVoidSubmit = async () => {
    if (!voidTarget) return
    const { reason } = await voidForm.validateFields()
    voidOrder.mutate(
      { id: voidTarget.id, reason: reason.trim() },
      {
        onSuccess: (record) => {
          message.success(`采购订单 ${record.code} 已作废`)
          setVoidTarget(null)
        },
        onError: (mutationError) => message.error(mutationError.message),
      },
    )
  }

  // ── 表单 / 详情视图 ────────────────────────────────────────────────
  if (view.mode === 'create') {
    return view.fromRequestId ? (
      <OrderCreateFromRequestView
        requestId={view.fromRequestId}
        onCancel={() => switchView({ mode: 'list' })}
        onSaved={() => switchView({ mode: 'list' })}
      />
    ) : (
      <PurchaseOrderFormView
        key="create"
        order={null}
        onCancel={() => switchView({ mode: 'list' })}
        onSaved={() => switchView({ mode: 'list' })}
      />
    )
  }
  if (view.mode === 'edit') {
    return (
      <OrderEditView
        id={view.id}
        onCancel={() => switchView({ mode: 'list' })}
        onSaved={() => switchView({ mode: 'list' })}
      />
    )
  }
  if (view.mode === 'detail') {
    return (
      <PurchaseOrderDetailView
        id={view.id}
        onBack={() => switchView({ mode: 'list' })}
        onEdit={() => switchView({ mode: 'edit', id: view.id })}
      />
    )
  }

  // ── 列表视图 ───────────────────────────────────────────────────────
  return (
    <div className="dashboard-page">
      <PageHeader
        title={routeMeta.purchaseOrder.title}
        description={routeMeta.purchaseOrder.description}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
              刷新
            </Button>
            {has('purchase:request:generate-order') ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => switchView({ mode: 'create' })}>
                新建采购订单
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
          message="采购订单列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <PurchaseOrderFilterBar onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        <Tabs activeKey={status} onChange={handleStatusChange} items={STATUS_TABS} />
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="采购订单列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <PurchaseOrderTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onView={(record) => switchView({ mode: 'detail', id: record.id })}
            onEdit={(record) => switchView({ mode: 'edit', id: record.id })}
            onDelete={(record) =>
              // 删除走确认气泡即可（无需填写内容），成功后列表随失效刷新。
              remove.mutate(record.id, {
                onSuccess: () => message.success(`采购订单 ${record.code} 已删除`),
                onError: (mutationError) => message.error(mutationError.message),
              })
            }
            onSend={(record) =>
              send.mutate(record.id, {
                onSuccess: (saved) =>
                  message.success(
                    record.status === 'rejected'
                      ? `采购订单 ${saved.code} 已重新发送供应商确认`
                      : `采购订单 ${saved.code} 已发送供应商确认`,
                  ),
                onError: (mutationError) => message.error(mutationError.message),
              })
            }
            onVoid={(record) => {
              voidForm.resetFields()
              setVoidTarget(record)
            }}
          />
        )}
      </Card>

      <Modal
        title={voidTarget ? `作废采购订单 · ${voidTarget.code}` : '作废采购订单'}
        open={voidTarget !== null}
        okText="确认作废"
        okButtonProps={{ danger: true, loading: voidOrder.isPending }}
        cancelText="取消"
        onCancel={() => setVoidTarget(null)}
        onOk={() => void handleVoidSubmit()}
        destroyOnHidden
      >
        <Form form={voidForm} layout="vertical">
          <Form.Item
            label="作废原因"
            name="reason"
            rules={[
              { required: true, whitespace: true, message: '请填写作废原因' },
              { max: 200, message: '原因不超过 200 个字符' },
            ]}
          >
            <Input.TextArea rows={3} placeholder="如：预算调整、重复下单、供应商无法交货等" maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
