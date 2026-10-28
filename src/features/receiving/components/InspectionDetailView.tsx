import { Alert, Button, Card, Descriptions, Space, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { InspectionResultTag } from './InspectionResultTag'
import { useInspectionDetail } from '../hooks/useReceivingQueries'
import type { InspectionItem } from '../types'
import { formatDateTime } from '@/utils'

interface InspectionDetailViewProps {
  id: string
  onBack: () => void
  /** 待验收单展示「去验收」；由父级跳转验收操作视图。 */
  onInspect?: () => void
}

/**
 * 验收单详情视图：单据概要 + 应收 / 实收 / 合格 / 不合格明细对照。
 * 纯只读（提交验收请走验收操作视图）；待验收单给出「去验收」入口。
 */
export function InspectionDetailView({ id, onBack, onInspect }: InspectionDetailViewProps) {
  const { data, isLoading, error } = useInspectionDetail(id)

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="验收单详情加载中">
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
          message="验收单详情加载失败"
          description={error?.message ?? '验收单不存在或已被移除'}
          action={<Button onClick={onBack}>返回列表</Button>}
        />
      </div>
    )
  }

  const settled = data.result !== 'pending'

  const columns: ColumnsType<InspectionItem> = [
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
    { title: '订单数量', dataIndex: 'orderedQty', width: 100, align: 'right' },
    { title: '实收数量', dataIndex: 'receivedQty', width: 100, align: 'right' },
    {
      title: '合格数量',
      dataIndex: 'qualifiedQty',
      width: 100,
      align: 'right',
      render: (value: number) =>
        settled ? (
          <Typography.Text strong type="success">
            {value}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: '不合格数量',
      dataIndex: 'unqualifiedQty',
      width: 110,
      align: 'right',
      render: (value: number) =>
        settled ? (
          <Typography.Text strong type={value > 0 ? 'danger' : undefined}>
            {value}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
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
          <Space size={8}>
            <Typography.Title level={2} className="mb-0!">
              验收单详情
            </Typography.Title>
            <InspectionResultTag result={data.result} />
          </Space>
          <Typography.Text type="secondary" className="block">
            {`${data.code} · 关联收货单 ${data.receiptCode} · 供应商 ${data.supplierName}`}
          </Typography.Text>
        </div>
        <Space>
          {data.result === 'pending' && onInspect ? (
            <Button type="primary" onClick={onInspect}>
              去验收
            </Button>
          ) : null}
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
          </Button>
        </Space>
      </div>

      <Card size="small" className="mt-4">
        <Descriptions column={4} size="small">
          <Descriptions.Item label="关联订单">{data.orderCode}</Descriptions.Item>
          <Descriptions.Item label="验收人">{data.inspectedByName ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="验收时间">
            {data.inspectedAt ? formatDateTime(data.inspectedAt) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="单据创建">{formatDateTime(data.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="验收备注" span={4}>
            {data.remark ?? '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="验收明细（应收 / 实收 / 合格对照）" className="mt-4">
        <Table<InspectionItem>
          rowKey="id"
          columns={columns}
          dataSource={data.items}
          pagination={false}
          scroll={{ x: 860 }}
          summary={(rows) => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Typography.Text strong>合计（{rows.length} 项）</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Typography.Text>{rows.reduce((sum, item) => sum + item.orderedQty, 0)}</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <Typography.Text strong>{rows.reduce((sum, item) => sum + item.receivedQty, 0)}</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                {settled ? (
                  <Typography.Text strong type="success">
                    {rows.reduce((sum, item) => sum + item.qualifiedQty, 0)}
                  </Typography.Text>
                ) : (
                  <Typography.Text type="secondary">—</Typography.Text>
                )}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                {settled ? (
                  <Typography.Text strong type="danger">
                    {rows.reduce((sum, item) => sum + item.unqualifiedQty, 0)}
                  </Typography.Text>
                ) : (
                  <Typography.Text type="secondary">—</Typography.Text>
                )}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6}>
                <span> </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
        {!settled ? (
          <Typography.Text type="secondary" className="mt-3 block">
            待验收单据尚未填写合格 / 不合格数量；提交后合格数量将进入入库环节。
          </Typography.Text>
        ) : null}
      </Card>
    </div>
  )
}
