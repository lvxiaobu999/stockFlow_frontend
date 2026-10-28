import { useState } from 'react'
import { Alert, App, Button, Card, Descriptions, Form, Input, InputNumber, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { useReceiptDetail } from '../hooks/useReceivingQueries'
import { useReceivingMutations } from '../hooks/useReceivingMutations'
import type { ReceiptItem } from '../types'

interface ReceiptConfirmViewProps {
  id: string
  onCancel: () => void
  /** 确认收货成功后回调（父级返回列表）。 */
  onConfirmed: () => void
}

/**
 * 确认收货视图：对照发货单逐行登记实收数量（默认 = 应发数量，可少收不可超收），
 * 备注记录破损 / 少件等异常。提交后生成待验收单、订单进入已收货。
 * 实收数量放组件内状态，只记录用户显式改过的行，未改动的行渲染时回落为应发数量；
 * 单据切换由父级以 key 重挂载本组件，避免串单。
 */
export function ReceiptConfirmView({ id, onCancel, onConfirmed }: ReceiptConfirmViewProps) {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const canConfirm = has('receiving:receipt:confirm')
  const { data, isLoading, error } = useReceiptDetail(id)
  const { confirmReceipt } = useReceivingMutations()
  const [form] = Form.useForm<{ remark?: string }>()
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  /** 行的当前实收数量：显式修改优先，否则默认 = 应发数量。 */
  const quantityOf = (item: ReceiptItem): number => quantities[item.productId] ?? item.expectedQty

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="确认收货加载中">
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
          message="收货单加载失败"
          description={error?.message ?? '收货单不存在'}
          action={<Button onClick={onCancel}>返回列表</Button>}
        />
      </div>
    )
  }
  // 状态兜底：仅待收货单可确认；已收货单从列表与 URL 直达两个入口都被拦下。
  if (data.status !== 'pending') {
    return (
      <div className="dashboard-page">
        <Alert
          type="warning"
          showIcon
          message="当前收货单已确认收货"
          description="实收数量已登记且不可修改；如数量有误请联系管理员处理（冲正能力第二阶段提供）。"
          action={<Button onClick={onCancel}>返回列表</Button>}
        />
      </div>
    )
  }

  const handleSubmit = () => {
    confirmReceipt.mutate(
      {
        id: data.id,
        payload: {
          remark: form.getFieldValue('remark')?.trim() || undefined,
          items: data.items.map((item) => ({
            productId: item.productId,
            receivedQty: quantityOf(item),
          })),
        },
      },
      {
        onSuccess: (record) => {
          message.success(`收货单 ${record.code} 已确认收货，待验收单 ${record.inspectionCode} 已生成`)
          onConfirmed()
        },
        onError: (mutationError) => message.error(mutationError.message),
      },
    )
  }

  const columns: ColumnsType<ReceiptItem> = [
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
    { title: '应发数量', dataIndex: 'expectedQty', width: 100, align: 'right' },
    {
      title: '实收数量',
      key: 'receivedQty',
      width: 160,
      render: (_, item) => (
        <InputNumber
          min={1}
          max={item.expectedQty}
          precision={0}
          value={quantityOf(item)}
          onChange={(value) =>
            setQuantities((prev) => ({ ...prev, [item.productId]: typeof value === 'number' ? value : 0 }))
          }
          disabled={!canConfirm}
          aria-label={`${item.productName} 实收数量`}
        />
      ),
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
            确认收货
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {`${data.code} · 对照发货单 ${data.shipmentCode} 登记实收数量，提交后进入验收环节`}
          </Typography.Text>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={onCancel}>
          取消
        </Button>
      </div>

      <Card size="small" className="mt-4">
        <Descriptions column={4} size="small">
          <Descriptions.Item label="关联订单">{data.orderCode}</Descriptions.Item>
          <Descriptions.Item label="供应商">{data.supplierName}</Descriptions.Item>
          <Descriptions.Item label="发货单号">{data.shipmentCode}</Descriptions.Item>
          <Descriptions.Item label="商品种类">{data.items.length}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="收货明细" className="mt-4">
        <Table<ReceiptItem>
          rowKey="id"
          columns={columns}
          dataSource={data.items}
          pagination={false}
          scroll={{ x: 680 }}
          summary={(rows) => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <Typography.Text strong>实收合计（{rows.length} 项）</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <Typography.Text strong>{rows.reduce((sum, item) => sum + quantityOf(item), 0)} 件</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <span> </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
        {!canConfirm ? (
          <Alert className="mt-4" type="info" showIcon message="你没有「确认收货」权限，仅可查看本次登记内容" />
        ) : null}
        <Form form={form} layout="vertical" className="mt-4 mb-0">
          <Form.Item label="收货备注" name="remark" className="mb-0">
            <Input.TextArea
              rows={2}
              placeholder="破损、少件等异常情况说明（选填，验收环节可见）"
              maxLength={200}
              showCount
              disabled={!canConfirm}
            />
          </Form.Item>
        </Form>
        <div className="mt-4 flex justify-end gap-3">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" loading={confirmReceipt.isPending} disabled={!canConfirm} onClick={handleSubmit}>
            提交收货
          </Button>
        </div>
      </Card>
    </div>
  )
}
