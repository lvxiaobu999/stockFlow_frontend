import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Popconfirm,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { ReconciliationStatusTag } from './ReconciliationStatusTag'
import { useReconciliationDetail, useReconciliationMutations } from '../hooks'
import { RECONCILIATION_DIFF_TYPE_META, type ReconciliationItem } from '../types'
import { downloadCsv, formatDateTime, formatMoney } from '@/utils'

interface ReconciliationDetailViewProps {
  id: string
  onBack: () => void
  /** 待确认 / 有差异单进入确认视图（确认通过或标记差异）。 */
  onConfirm: (recordId: string) => void
  /** 草稿进入编辑视图。 */
  onEdit: (recordId: string) => void
}

/** 明细导出表头（MVP 以 CSV 代替 Excel 导出，偏差已记录）。 */
const EXPORT_HEADER = [
  '收货单号',
  '订单号',
  '商品编码',
  '商品名称',
  '规格',
  '单位',
  '采购数量',
  '实收数量',
  '成交单价',
  '对账金额',
  '已付金额',
  '收货日期',
  '备注',
]

/**
 * 对账单详情视图：基本信息 + 金额四卡 + 明细表 + 按状态与权限收敛的操作区
 * （导出明细 / 确认·处理差异 / 编辑草稿 / 关闭 / 关联付款占位二期）。
 */
export function ReconciliationDetailView({ id, onBack, onConfirm, onEdit }: ReconciliationDetailViewProps) {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const canCreate = has('reconciliation:list:create')
  const canConfirm = has('reconciliation:list:confirm')
  const canClose = has('reconciliation:list:close')
  const { data, isLoading, error } = useReconciliationDetail(id)
  const { closeReconciliation } = useReconciliationMutations()

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="对账单详情加载中">
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
          message="对账单详情加载失败"
          description={error?.message ?? '对账单不存在或已被移除'}
          action={<Button onClick={onBack}>返回列表</Button>}
        />
      </div>
    )
  }

  /** 导出明细为 CSV（当前明细全量，含合计行）。 */
  const handleExport = () => {
    const rows = data.items.map((item) => [
      item.receiptCode,
      item.orderCode,
      item.productCode,
      item.productName,
      item.spec,
      item.unit,
      item.orderedQty,
      item.receivedQty,
      item.unitPrice,
      item.amount,
      item.paidAmount,
      item.receivedAt,
      item.remark ?? '',
    ])
    const payable = data.items.reduce((sum, item) => sum + item.amount, 0)
    const paid = data.items.reduce((sum, item) => sum + item.paidAmount, 0)
    rows.push([
      '合计',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      Math.round(payable * 100) / 100,
      Math.round(paid * 100) / 100,
      '',
      '',
    ])
    downloadCsv(`${data.code}-对账明细.csv`, EXPORT_HEADER, rows)
    message.success('明细已导出为 CSV 文件')
  }

  const handleClose = () => {
    closeReconciliation.mutate(
      { id: data.id },
      {
        onSuccess: (record) => message.success(`对账单 ${record.code} 已关闭`),
        onError: (mutationError) => message.error(mutationError.message),
      },
    )
  }

  const columns: ColumnsType<ReconciliationItem> = [
    {
      title: '收货单号',
      dataIndex: 'receiptCode',
      width: 160,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    { title: '订单号', dataIndex: 'orderCode', width: 160 },
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
    { title: '采购数量', dataIndex: 'orderedQty', width: 90, align: 'right' },
    {
      title: '实收数量',
      dataIndex: 'receivedQty',
      width: 90,
      align: 'right',
      render: (value: number) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: '成交单价',
      dataIndex: 'unitPrice',
      width: 100,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '对账金额',
      dataIndex: 'amount',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    { title: '收货日期', dataIndex: 'receivedAt', width: 105 },
    {
      title: '备注',
      dataIndex: 'remark',
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
  ]

  const amountCards = [
    { key: 'order', title: '订单金额', value: data.orderAmount, tone: 'default' as const },
    { key: 'payable', title: '应付金额（实收口径）', value: data.payableAmount, tone: 'primary' as const },
    { key: 'paid', title: '已付金额', value: data.paidAmount, tone: 'default' as const },
    { key: 'unpaid', title: '待付金额', value: data.unpaidAmount, tone: 'warning' as const },
  ]

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            对账单详情
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {`${data.code} · ${data.supplierName} · 对账期间 ${data.periodStart} ~ ${data.periodEnd}`}
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出明细
          </Button>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
          </Button>
        </Space>
      </div>

      {data.status === 'disputed' ? (
        <Alert
          className="mt-4"
          type="error"
          showIcon
          message={`已标记${RECONCILIATION_DIFF_TYPE_META[data.diffType ?? 'other']}，差异金额 ¥${formatMoney(data.diffAmount ?? 0)}`}
          description={data.diffReason}
        />
      ) : null}

      <Row gutter={[16, 16]} className="mt-4">
        {amountCards.map((card) => (
          <Col key={card.key} xs={12} lg={6}>
            <Card size="small">
              <Statistic
                title={card.title}
                value={`¥${formatMoney(card.value)}`}
                valueStyle={
                  card.tone === 'primary'
                    ? { color: '#1677ff' }
                    : card.tone === 'warning'
                      ? { color: '#d46b08' }
                      : undefined
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card size="small" className="mt-4">
        <Descriptions column={4} size="small">
          <Descriptions.Item label="状态">
            <ReconciliationStatusTag status={data.status} />
          </Descriptions.Item>
          <Descriptions.Item label="创建人">{data.createdByName}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDateTime(data.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="明细数">{data.items.length} 行</Descriptions.Item>
          <Descriptions.Item label="确认人" span={2}>
            {data.confirmedByName ? `${data.confirmedByName} · ${formatDateTime(data.confirmedAt!)}` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="关闭人" span={2}>
            {data.closedByName ? `${data.closedByName} · ${formatDateTime(data.closedAt!)}` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="对账备注" span={2}>
            {data.remark ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="关闭说明" span={2}>
            {data.closedRemark ?? '—'}
          </Descriptions.Item>
        </Descriptions>
        <div className="mt-3 flex justify-end gap-3">
          {data.status === 'draft' ? (
            <Button type="primary" disabled={!canCreate} onClick={() => onEdit(data.id)}>
              编辑草稿
            </Button>
          ) : null}
          {data.status === 'pending' || data.status === 'disputed' ? (
            <Button type="primary" disabled={!canConfirm} onClick={() => onConfirm(data.id)}>
              确认 / 处理差异
            </Button>
          ) : null}
          {data.status === 'confirmed' ? (
            <Popconfirm
              title="关闭后对账单进入终态，不可再操作"
              description="请确认关联付款已完成或已人工核对完毕。"
              okText="关闭"
              cancelText="取消"
              onConfirm={handleClose}
            >
              <Button type="primary" disabled={!canClose} loading={closeReconciliation.isPending}>
                关闭对账单
              </Button>
            </Popconfirm>
          ) : null}
          {data.status === 'confirmed' || data.status === 'closed' ? (
            <Tooltip title="关联付款在付款管理模块落地后开放（二期）">
              <Tag className="cursor-default">关联付款（二期）</Tag>
            </Tooltip>
          ) : null}
        </div>
      </Card>

      <Card size="small" title="对账明细（收货单 × 商品）" className="mt-4">
        <Table<ReconciliationItem>
          rowKey="id"
          columns={columns}
          dataSource={data.items}
          pagination={false}
          scroll={{ x: 1280 }}
          summary={(rows) => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={6}>
                <Typography.Text strong>合计（{rows.length} 行明细）</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <span> </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right">
                <Typography.Text strong>¥{formatMoney(data.payableAmount)}</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right">
                <Typography.Text strong>¥{formatMoney(data.paidAmount)}</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={9} colSpan={2}>
                <span> </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
          locale={{ emptyText: '暂无对账明细' }}
        />
      </Card>
    </div>
  )
}
