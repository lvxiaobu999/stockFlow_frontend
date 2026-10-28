import { Button, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { InspectionResultTag } from './InspectionResultTag'
import type { InspectionRecord } from '../types'
import { formatShortDateTime, toPaginationTotal } from '@/utils'
import type { PaginatedData } from '@/services/httpClient'

interface InspectionTableProps {
  data: PaginatedData<InspectionRecord> | null
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  onView: (record: InspectionRecord) => void
  /** 待验收单进入验收操作视图。 */
  onInspect: (record: InspectionRecord) => void
}

/**
 * 验收单列表：合格数量绿色突出、不合格数量红色突出（需求界面风格），
 * 待验收单提供「去验收」入口，已验收单只读查看。
 */
export function InspectionTable({ data, loading, fetching, onPageChange, onView, onInspect }: InspectionTableProps) {
  const columns: ColumnsType<InspectionRecord> = [
    {
      title: '验收单号',
      dataIndex: 'code',
      width: 165,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: '关联收货单',
      dataIndex: 'receiptCode',
      width: 165,
      render: (receiptCode: string) => <Typography.Text>{receiptCode}</Typography.Text>,
    },
    {
      title: '关联订单',
      dataIndex: 'orderCode',
      width: 165,
      render: (orderCode: string) => <Typography.Text>{orderCode}</Typography.Text>,
    },
    { title: '供应商', dataIndex: 'supplierName', width: 150, ellipsis: true },
    {
      title: '合格数量',
      key: 'qualifiedQty',
      width: 100,
      align: 'right',
      render: (_, record) =>
        record.result === 'pending' ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Typography.Text strong type="success">
            {record.items.reduce((sum, item) => sum + item.qualifiedQty, 0)}
          </Typography.Text>
        ),
    },
    {
      title: '不合格数量',
      key: 'unqualifiedQty',
      width: 110,
      align: 'right',
      render: (_, record) =>
        record.result === 'pending' ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Typography.Text strong type="danger">
            {record.items.reduce((sum, item) => sum + item.unqualifiedQty, 0)}
          </Typography.Text>
        ),
    },
    {
      title: '结论',
      dataIndex: 'result',
      width: 110,
      render: (result: InspectionRecord['result']) => <InspectionResultTag result={result} />,
    },
    {
      title: '验收时间',
      dataIndex: 'inspectedAt',
      width: 130,
      render: (value: string | undefined) =>
        value ? formatShortDateTime(value) : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 130,
      render: (_, record) => (
        <Space size={0} split={<Typography.Text type="secondary">|</Typography.Text>}>
          {record.result === 'pending' ? (
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
    <Table<InspectionRecord>
      rowKey="id"
      columns={columns}
      dataSource={data?.lists ?? []}
      loading={loading}
      rowClassName={() => (fetching ? 'opacity-70' : '')}
      scroll={{ x: 1180 }}
      pagination={{
        // 后端 total 口径是总页数，换算成 antd 需要的总条数。
        total: data ? toPaginationTotal(data.total, data.pageSize) : 0,
        current: data?.current ?? 1,
        pageSize: data?.pageSize ?? 20,
        onChange: onPageChange,
        showSizeChanger: true,
        showTotal: (total) => `共 ${Math.ceil(total / (data?.pageSize ?? 20))} 页`,
      }}
      locale={{ emptyText: '暂无验收单，确认收货后会自动生成待验收单据' }}
    />
  )
}
