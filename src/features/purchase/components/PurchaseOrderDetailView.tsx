import { useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, SendOutlined } from '@ant-design/icons'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { PurchaseOrderStatusTag } from '@/features/purchase/components/PurchaseOrderStatusTag'
import { usePurchaseOrderDetail } from '@/features/purchase/hooks/usePurchaseOrders'
import { usePurchaseOrderMutations } from '@/features/purchase/hooks/usePurchaseOrderMutations'
import type { PurchaseOrderItem } from '@/features/purchase/types'
import {
  buildOrderTimeline,
  calcOrderTotalAmount,
  canDeleteOrder,
  canSendOrder,
  canVoidOrder,
  isOrderEditable,
} from '@/features/purchase/utils/purchaseOrder'
import { formatDateTime, formatMoney } from '@/utils'

interface PurchaseOrderDetailViewProps {
  id: string
  onBack: () => void
  /** 进入编辑（仅草稿）；未提供时隐藏编辑入口（如详情被其他页面复用）。 */
  onEdit?: () => void
}

/**
 * 采购订单详情视图：概要卡片 + 订单明细 + 状态时间线 / 关联单据。
 *
 * 头部按状态给出主操作（草稿编辑 / 发送 / 删除，待确认与已拒绝作废，
 * 已拒绝重发）；时间线由单据上的状态时间戳派生（服务端不单独维护流水表）。
 * 供应商确认之后的推进动作（发货 / 收货 / 验收 / 付款结清）属供应商端、
 * 收货验收与付款模块，这里只读展示；关联单据区在对应模块上线前显示占位。
 */
export function PurchaseOrderDetailView({ id, onBack, onEdit }: PurchaseOrderDetailViewProps) {
  const { message } = App.useApp()
  const { data, isLoading, error } = usePurchaseOrderDetail(id)
  const { remove, send, voidOrder } = usePurchaseOrderMutations()
  const { has } = usePermissions()
  const canEdit = has('purchase:order:update') && Boolean(onEdit)
  const canSend = has('purchase:order:send')
  const canDelete = has('purchase:order:delete')
  const canVoid = has('purchase:order:void')
  // 作废必须填原因：用受控 Modal 收集（行内 Popconfirm 装不下文本域）。
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidForm] = Form.useForm<{ reason: string }>()

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="采购订单详情加载中">
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
          message="采购订单详情加载失败"
          description={error?.message ?? '订单不存在或已被移除'}
          action={<Button onClick={onBack}>返回列表</Button>}
        />
      </div>
    )
  }

  const statusCta = (() => {
    return (
      <Space>
        {isOrderEditable(data.status) && canEdit ? (
          <Button type="primary" onClick={onEdit}>
            编辑
          </Button>
        ) : null}
        {canSendOrder(data.status) && canSend ? (
          <Popconfirm
            title={data.status === 'rejected' ? '重新发送采购订单' : '发送采购订单'}
            description={
              data.status === 'rejected'
                ? '重发后订单重新进入待供应商确认，确认发送？'
                : '发送后订单进入待供应商确认，供应商将在门户确认或拒绝。确认发送？'
            }
            okText="发送"
            cancelText="取消"
            onConfirm={() =>
              send.mutate(data.id, {
                onSuccess: (record) => message.success(`采购订单 ${record.code} 已发送供应商确认`),
                onError: (mutationError) => message.error(mutationError.message),
              })
            }
          >
            <Button type="primary" ghost icon={<SendOutlined />} loading={send.isPending}>
              {data.status === 'rejected' ? '重新发送' : '发送供应商'}
            </Button>
          </Popconfirm>
        ) : null}
        {canVoidOrder(data.status) && canVoid ? (
          <Button danger onClick={() => setVoidOpen(true)}>
            作废
          </Button>
        ) : null}
        {canDeleteOrder(data.status) && canDelete ? (
          <Popconfirm
            title="删除采购订单"
            description="草稿删除后不可恢复，来源申请将回到「已通过」。确认删除？"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() =>
              remove.mutate(data.id, {
                onSuccess: () => {
                  message.success(`采购订单 ${data.code} 已删除`)
                  onBack()
                },
                onError: (mutationError) => message.error(mutationError.message),
              })
            }
          >
            <Button danger loading={remove.isPending}>
              删除
            </Button>
          </Popconfirm>
        ) : null}
      </Space>
    )
  })()

  const itemColumns: ColumnsType<PurchaseOrderItem> = [
    {
      title: '商品',
      render: (_, item) => (
        <div className="min-w-0">
          <Typography.Text className="block truncate">{item.productName}</Typography.Text>
          <Typography.Text type="secondary" className="block truncate text-xs">
            {item.productCode} · {item.spec}
          </Typography.Text>
        </div>
      ),
    },
    { title: '单位', dataIndex: 'unit', width: 70 },
    { title: '数量', dataIndex: 'quantity', width: 90, align: 'right' },
    {
      title: '成交单价',
      dataIndex: 'unitPrice',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 160,
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
  ]

  const timelineNodes = buildOrderTimeline(data)

  /** 提交作废：原因必填，成功后返回列表（终态单据无后续动作）。 */
  const handleVoidSubmit = async () => {
    const { reason } = await voidForm.validateFields()
    voidOrder.mutate(
      { id: data.id, reason: reason.trim() },
      {
        onSuccess: (record) => {
          message.success(`采购订单 ${record.code} 已作废`)
          setVoidOpen(false)
          onBack()
        },
        onError: (mutationError) => message.error(mutationError.message),
      },
    )
  }

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <Space size={8}>
            <Typography.Title level={2} className="mb-0!">
              采购订单详情
            </Typography.Title>
            <PurchaseOrderStatusTag status={data.status} />
          </Space>
          <Typography.Text type="secondary" className="block">
            {`${data.code} · 供应商 ${data.supplierName} · 订单金额 ¥${formatMoney(data.totalAmount)}`}
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
          <Descriptions.Item label="供应商" span={2}>
            {data.supplierName}
          </Descriptions.Item>
          <Descriptions.Item label="采购员">{data.purchaserName}</Descriptions.Item>
          <Descriptions.Item label="期望交货">{data.expectedDate ?? '—'}</Descriptions.Item>
          {/* 供应商在门户确认时承诺的发货时间（确认动作回写）。 */}
          <Descriptions.Item label="预计发货">
            {data.promisedShipDate ? (
              <Tag color="green">{data.promisedShipDate}</Tag>
            ) : (
              <Typography.Text type="secondary">—</Typography.Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDateTime(data.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="来源申请" span={2}>
            {data.requestCode ? (
              <Tag color="processing">{`${data.requestCode}（已生成订单）`}</Tag>
            ) : (
              <Typography.Text type="secondary">线下补录（未关联申请）</Typography.Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={4}>
            {data.remark ?? '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <div className="mt-4 flex items-stretch gap-4">
        <div className="min-w-0 flex-1">
          <Card size="small" title="订单明细">
            <Table<PurchaseOrderItem>
              rowKey="id"
              columns={itemColumns}
              dataSource={data.items}
              pagination={false}
              scroll={{ x: 760 }}
              summary={(rows) => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <Typography.Text strong>合计（{rows.length} 项）</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Typography.Text strong>¥{formatMoney(calcOrderTotalAmount(rows))}</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    <span> </span>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
          <Card size="small" title="关联单据" className="mt-4">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Typography.Text type="secondary">
                  供应商发货单已在供应商门户生成；收货单、验收单与付款记录模块落地后，关联单据将在此一并展示
                </Typography.Text>
              }
            />
          </Card>
        </div>
        <div className="w-96 shrink-0">
          <Card size="small" title="状态时间线" className="h-full">
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

      <Modal
        title="作废采购订单"
        open={voidOpen}
        okText="确认作废"
        okButtonProps={{ danger: true, loading: voidOrder.isPending }}
        cancelText="取消"
        onCancel={() => setVoidOpen(false)}
        onOk={() => void handleVoidSubmit()}
        destroyOnHidden
      >
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message="作废后订单进入终态，不可恢复；来源申请将回到「已通过」，可重新生成订单"
        />
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
