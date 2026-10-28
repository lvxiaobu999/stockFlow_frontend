import { Alert, Button, Card, Descriptions, Space, Spin, Table, Tag, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { ReceiptStatusTag } from './ReceiptStatusTag'
import { InspectionResultTag } from './InspectionResultTag'
import { useReceiptDetail } from '../hooks/useReceivingQueries'
import type { ReceiptItem } from '../types'
import { formatDateTime } from '@/utils'

interface ReceiptDetailViewProps {
  id: string
  onBack: () => void
  /** 已收货且验收未落结论时展示「去验收」；由父级跳转验收操作视图。 */
  onInspect?: (inspectionId: string) => void
}

/**
 * 收货单详情视图：单据概要 + 应发 / 实收明细对照 + 关联单据信息。
 * 纯只读（确认收货请走确认视图）；关联验收单按当前结论给出入口。
 */
export function ReceiptDetailView({ id, onBack, onInspect }: ReceiptDetailViewProps) {
  const { data, isLoading, error } = useReceiptDetail(id)

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="收货单详情加载中">
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
          message="收货单详情加载失败"
          description={error?.message ?? '收货单不存在或已被移除'}
          action={<Button onClick={onBack}>返回列表</Button>}
        />
      </div>
    )
  }

  const canInspect = data.status === 'received' && data.inspectionId && data.inspectionResult === 'pending'

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
      dataIndex: 'receivedQty',
      width: 100,
      align: 'right',
      render: (value: number) =>
        data.status === 'received' ? (
          <Typography.Text strong>{value}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">未登记</Typography.Text>
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
            收货单详情
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {`${data.code} · 关联订单 ${data.orderCode} · 供应商 ${data.supplierName}`}
          </Typography.Text>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回
        </Button>
      </div>

      <Card size="small" className="mt-4">
        <Descriptions column={4} size="small">
          <Descriptions.Item label="状态" span={2}>
            <Space>
              <ReceiptStatusTag status={data.status} />
              {data.inspectionResult ? <InspectionResultTag result={data.inspectionResult} /> : null}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="收货人">{data.receivedByName ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="收货时间">
            {data.receivedAt ? formatDateTime(data.receivedAt) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="发货单号" span={2}>
            {/* 发货单在供应商门户生成；此处展示单号供与供应商对账核对。 */}
            <Tag color="cyan">{data.shipmentCode}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="单据创建" span={2}>
            {formatDateTime(data.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="收货备注" span={4}>
            {data.remark ?? '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="收货明细（应发 / 实收对照）" className="mt-4">
        <Table<ReceiptItem>
          rowKey="id"
          columns={columns}
          dataSource={data.items}
          pagination={false}
          scroll={{ x: 640 }}
          summary={(rows) => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Typography.Text strong>合计（{rows.length} 项）</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Typography.Text strong>{rows.reduce((sum, item) => sum + item.expectedQty, 0)}</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <Typography.Text strong>
                  {data.status === 'received' ? rows.reduce((sum, item) => sum + item.receivedQty, 0) : '—'}
                </Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <span> </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      <Card size="small" title="关联验收单" className="mt-4">
        {data.inspectionId ? (
          <div className="flex items-center justify-between">
            <Space>
              <Typography.Text>验收单 {data.inspectionCode}</Typography.Text>
              {data.inspectionResult ? <InspectionResultTag result={data.inspectionResult} /> : null}
            </Space>
            {canInspect && onInspect ? (
              <Button type="primary" onClick={() => onInspect(data.inspectionId!)}>
                去验收
              </Button>
            ) : null}
          </div>
        ) : (
          <Typography.Text type="secondary">确认收货后自动生成待验收单</Typography.Text>
        )}
      </Card>
    </div>
  )
}
