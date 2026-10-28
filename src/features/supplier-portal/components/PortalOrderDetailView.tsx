import { useState } from 'react'
import { Alert, Button, Card, Descriptions, Space, Spin, Tag, Timeline, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { PurchaseOrderStatusTag } from '@/features/purchase/components/PurchaseOrderStatusTag'
import { buildOrderTimeline } from '@/features/purchase/utils/purchaseOrder'
import { ConfirmOrderModal } from './ConfirmOrderModal'
import { PortalOrderItemsTable } from './PortalOrderItemsTable'
import { RejectOrderModal } from './RejectOrderModal'
import { usePortalOrderDetail } from '../hooks/usePortalQueries'
import { formatDateTime, formatMoney } from '@/utils'

interface PortalOrderDetailViewProps {
  id: string
  onBack: () => void
  /** 去发货（已确认态）：由父级跳转发货表单；未提供时隐藏该入口。 */
  onShip?: () => void
}

/**
 * 门户订单详情视图：订单概要 + 商品明细 + 状态时间线。
 *
 * 头部按状态给出供应商侧动作（待确认 → 确认 / 拒绝，已确认 → 填写发货）；
 * 收货之后的推进（收货 / 验收 / 结算）由采购方操作，这里只读展示。
 * 时间线复用采购域的派生工具——两端看到同一份推进口径。
 */
export function PortalOrderDetailView({ id, onBack, onShip }: PortalOrderDetailViewProps) {
  const { data, isLoading, error } = usePortalOrderDetail(id)
  const { has } = usePermissions()
  const canConfirm = has('supplier-portal:order:confirm')
  const canReject = has('supplier-portal:order:reject')
  const canShip = has('supplier-portal:order:ship')
  // 确认 / 拒绝弹窗为详情视图内部状态；列表页的行内动作另有一组弹窗实例。
  const [confirmTarget, setConfirmTarget] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(false)

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="订单详情加载中">
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
          message="订单详情加载失败"
          description={error?.message ?? '订单不存在或不属于当前供应商'}
          action={<Button onClick={onBack}>返回列表</Button>}
        />
      </div>
    )
  }

  const statusCta = (() => {
    switch (data.status) {
      case 'pending_supplier':
        return (
          <Space>
            {canConfirm ? (
              <Button type="primary" onClick={() => setConfirmTarget(true)}>
                确认订单
              </Button>
            ) : null}
            {canReject ? (
              <Button danger onClick={() => setRejectTarget(true)}>
                拒绝订单
              </Button>
            ) : null}
          </Space>
        )
      case 'confirmed':
        return canShip && onShip ? (
          <Button type="primary" onClick={onShip}>
            填写发货
          </Button>
        ) : null
      default:
        return null
    }
  })()

  const timelineNodes = buildOrderTimeline(data)

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <Space size={8}>
            <Typography.Title level={2} className="mb-0!">
              订单详情
            </Typography.Title>
            <PurchaseOrderStatusTag status={data.status} />
          </Space>
          <Typography.Text type="secondary" className="block">
            {`${data.code} · 下单时间 ${formatDateTime(data.createdAt)} · 订单金额 ¥${formatMoney(data.totalAmount)}`}
          </Typography.Text>
        </div>
        <Space>
          {statusCta}
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
          </Button>
        </Space>
      </div>

      <Card size="small" className="mt-4">
        <Descriptions column={4} size="small">
          <Descriptions.Item label="采购方采购员">{data.purchaserName}</Descriptions.Item>
          <Descriptions.Item label="期望交货">{data.expectedDate ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="预计发货">
            {data.promisedShipDate ? (
              <Tag color="green">{data.promisedShipDate}</Tag>
            ) : (
              <Typography.Text type="secondary">—</Typography.Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="买家备注">{data.remark ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <div className="mt-4 flex items-stretch gap-4">
        <div className="min-w-0 flex-1">
          <Card size="small" title="商品明细">
            <PortalOrderItemsTable items={data.items} totalAmount={data.totalAmount} />
          </Card>
        </div>
        <div className="w-96 shrink-0">
          <Card size="small" title="订单进度" className="h-full">
            <Timeline
              items={timelineNodes.map((node) => ({
                key: node.key,
                color: node.color,
                // antd v6 用 content 承载节点内容（children 已废弃）。
                content: (
                  <div>
                    <Typography.Text type="secondary" className="block text-xs">
                      {node.time ? formatDateTime(node.time) : '未到达'}
                    </Typography.Text>
                    <Typography.Text strong className="block">
                      {node.label}
                    </Typography.Text>
                    {node.note ? (
                      <Typography.Paragraph
                        type="secondary"
                        className="mt-1 mb-0 rounded bg-slate-50 px-3 py-2 text-xs"
                      >
                        {node.note}
                      </Typography.Paragraph>
                    ) : null}
                  </div>
                ),
              }))}
            />
          </Card>
        </div>
      </div>

      <ConfirmOrderModal order={confirmTarget ? data : null} onClose={() => setConfirmTarget(false)} />
      <RejectOrderModal order={rejectTarget ? data : null} onClose={() => setRejectTarget(false)} />
    </div>
  )
}
