import { useState } from 'react'
import { Alert, App, Button, Card, Descriptions, Form, Input, InputNumber, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePortalOrderDetail } from '../hooks/usePortalQueries'
import { usePortalMutations } from '../hooks/usePortalMutations'
import type { PurchaseOrderItem } from '../types'
import { formatMoney } from '@/utils'

interface ShipFormViewProps {
  id: string
  onCancel: () => void
  /** 发货成功后回调（父级返回列表）。 */
  onShipped: () => void
}

interface ShipFormValues {
  logisticsCompany?: string
  trackingNo?: string
  remark?: string
}

/**
 * 填写发货表单（已确认订单 → 已发货）：
 * - 物流公司 / 单号可选（支持自送），备注可选；
 * - 发货数量按商品逐行填写，默认 = 订单数量，范围 1 ~ 订购数（MVP 一次发清）；
 * - 提交生成发货单并推进订单状态，成功后双单据号一并提示。
 */
export function ShipFormView({ id, onCancel, onShipped }: ShipFormViewProps) {
  const { message } = App.useApp()
  const { data, isLoading, error } = usePortalOrderDetail(id)
  const { ship } = usePortalMutations()
  const [form] = Form.useForm<ShipFormValues>()
  // 发货数量放组件内状态（Form.List 嵌 Table 的校验联动成本高于收益）。
  // 只记录用户显式改过的行，未改动的行在渲染时回落为订单数量（默认发清）；
  // 订单切换由父级以 key 重挂载本组件，避免串单。
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  /** 行的当前发货数量：显式修改优先，否则默认 = 订购数量。 */
  const quantityOf = (item: PurchaseOrderItem): number => quantities[item.productId] ?? item.quantity

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="发货表单加载中">
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
          message="订单加载失败"
          description={error?.message ?? '订单不存在或不属于当前供应商'}
          action={<Button onClick={onCancel}>返回列表</Button>}
        />
      </div>
    )
  }
  // 状态兜底：仅已确认订单可发货；用户直接输入 URL 进入时给出明确解释。
  if (data.status !== 'confirmed') {
    return (
      <div className="dashboard-page">
        <Alert
          type="warning"
          showIcon
          message="当前订单状态不允许发货"
          description="仅「已确认」状态的订单可以填写发货；请先在订单详情中确认订单。"
          action={<Button onClick={onCancel}>返回列表</Button>}
        />
      </div>
    )
  }

  const totalQty = data.items.reduce((sum, item) => sum + quantityOf(item), 0)

  const handleSubmit = () => {
    const values = form.getFieldsValue()
    ship.mutate(
      {
        id: data.id,
        payload: {
          logisticsCompany: values.logisticsCompany?.trim() || undefined,
          trackingNo: values.trackingNo?.trim() || undefined,
          remark: values.remark?.trim() || undefined,
          items: data.items.map((item) => ({
            productId: item.productId,
            shippedQty: quantityOf(item),
          })),
        },
      },
      {
        onSuccess: ({ order, shipment }) => {
          message.success(`发货单 ${shipment.code} 已创建，采购订单 ${order.code} 已发货`)
          onShipped()
        },
        onError: (mutationError) => message.error(mutationError.message),
      },
    )
  }

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
    { title: '订购数量', dataIndex: 'quantity', width: 100, align: 'right' },
    {
      title: '本次发货数量',
      key: 'shippedQty',
      width: 160,
      render: (_, item) => (
        <InputNumber
          min={1}
          max={item.quantity}
          precision={0}
          value={quantityOf(item)}
          onChange={(value) =>
            setQuantities((prev) => ({ ...prev, [item.productId]: typeof value === 'number' ? value : 0 }))
          }
          aria-label={`${item.productName} 发货数量`}
        />
      ),
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '行备注',
      dataIndex: 'remark',
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
  ]

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            填写发货
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {`${data.code} · 提交后订单进入「已发货」，等待采购方收货确认`}
          </Typography.Text>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={onCancel}>
          取消
        </Button>
      </div>

      <Card size="small" className="mt-4">
        <Descriptions column={4} size="small">
          <Descriptions.Item label="采购方采购员">{data.purchaserName}</Descriptions.Item>
          <Descriptions.Item label="期望交货">{data.expectedDate ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="订单金额">¥{formatMoney(data.totalAmount)}</Descriptions.Item>
          <Descriptions.Item label="买家备注">{data.remark ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Form form={form} layout="vertical" className="mt-4">
        <Card size="small" title="物流信息">
          <div className="flex flex-wrap gap-x-6 gap-y-0">
            <Form.Item label="物流公司" name="logisticsCompany" className="min-w-56">
              <Input placeholder="如：顺丰速运 / 德邦物流 / 自送" maxLength={50} allowClear />
            </Form.Item>
            <Form.Item label="物流单号" name="trackingNo" className="min-w-56">
              <Input placeholder="承运方运单号（自送可留空）" maxLength={50} allowClear />
            </Form.Item>
            <Form.Item label="发货备注" name="remark" className="min-w-96 flex-1">
              <Input.TextArea rows={1} placeholder="包装、到货要求等需要采购方注意的信息" maxLength={200} showCount />
            </Form.Item>
          </div>
        </Card>
      </Form>

      <Card size="small" title="发货明细" className="mt-4">
        <Table<PurchaseOrderItem>
          rowKey="productId"
          columns={itemColumns}
          dataSource={data.items}
          pagination={false}
          scroll={{ x: 760 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Typography.Text strong>本次发货合计（{data.items.length} 种商品）</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={2} align="right">
                <Typography.Text strong>共 {totalQty} 件</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={2}>
                <span> </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" loading={ship.isPending} onClick={handleSubmit}>
            提交发货
          </Button>
        </div>
      </Card>
    </div>
  )
}
