import { Button, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { ReceiptStatusTag } from './ReceiptStatusTag'
import type { ReceiptRecord } from '../types'
import { formatShortDateTime, toPaginationTotal } from '@/utils'
import type { PaginatedData } from '@/services/httpClient'

interface ReceiptTableProps {
  data: PaginatedData<ReceiptRecord> | null
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  onView: (record: ReceiptRecord) => void
  /** 待收货单进入确认收货视图。 */
  onConfirm: (record: ReceiptRecord) => void
  /** 已收货单关联的待验收单进入验收操作视图。 */
  onInspect: (record: ReceiptRecord) => void
}

/**
 * 收货单列表：待收货单提供「确认收货」入口（按按钮权限码收敛），
 * 已收货单可「去验收」（存在关联验收单且未落结论时）或查看详情。
 */
export function ReceiptTable({
  data,
  loading,
  fetching,
  onPageChange,
  onView,
  onConfirm,
  onInspect,
}: ReceiptTableProps) {
  const { has } = usePermissions()
  const canConfirm = has('receiving:receipt:confirm')

  const columns: ColumnsType<ReceiptRecord> = [
    {
      title: '收货单号',
      dataIndex: 'code',
      width: 165,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: '关联订单',
      dataIndex: 'orderCode',
      width: 165,
      render: (orderCode: string) => <Typography.Text>{orderCode}</Typography.Text>,
    },
    { title: '供应商', dataIndex: 'supplierName', width: 160, ellipsis: true },
    {
      title: '明细数',
      dataIndex: 'items',
      width: 80,
      align: 'right',
      render: (_, record) => record.items.length,
    },
    {
      title: '实收件数',
      key: 'receivedQty',
      width: 100,
      align: 'right',
      render: (_, record) =>
        record.status === 'received' ? (
          <Typography.Text strong>{record.items.reduce((sum, item) => sum + item.receivedQty, 0)}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: '收货人',
      dataIndex: 'receivedByName',
      width: 100,
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '单据时间',
      dataIndex: 'createdAt',
      width: 130,
      render: (value: string) => formatShortDateTime(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: ReceiptRecord['status']) => <ReceiptStatusTag status={status} />,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 190,
      render: (_, record) => (
        <Space size={0} split={<Typography.Text type="secondary">|</Typography.Text>}>
          {record.status === 'pending' ? (
            <Button type="link" size="small" disabled={!canConfirm} onClick={() => onConfirm(record)}>
              确认收货
            </Button>
          ) : null}
          {record.status === 'received' && record.inspectionId && record.inspectionResult === 'pending' ? (
            <Button type="link" size="small" onClick={() => onInspect(record)}>
              去验收
            </Button>
          ) : null}
          <Button type="link" size="small" onClick={() => onView(record)}>
            查看
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Table<ReceiptRecord>
      rowKey="id"
      columns={columns}
      dataSource={data?.lists ?? []}
      loading={loading}
      rowClassName={() => (fetching ? 'opacity-70' : '')}
      scroll={{ x: 1100 }}
      pagination={{
        // 后端 total 口径是总页数，换算成 antd 需要的总条数。
        total: data ? toPaginationTotal(data.total, data.pageSize) : 0,
        current: data?.current ?? 1,
        pageSize: data?.pageSize ?? 20,
        onChange: onPageChange,
        showSizeChanger: true,
        showTotal: (total) => `共 ${Math.ceil(total / (data?.pageSize ?? 20))} 页`,
      }}
      locale={{ emptyText: '暂无收货单，供应商发货后会自动生成待收货单据' }}
    />
  )
}
