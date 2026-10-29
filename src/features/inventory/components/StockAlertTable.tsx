import { Button, Space, Table, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PaginatedData } from '@/services/httpClient'
import { formatShortDateTime, toPaginationTotal } from '@/utils'
import type { StockAlertRecord } from '@/features/inventory/types'

interface StockAlertTableProps {
  data: PaginatedData<StockAlertRecord> | null
  loading: boolean
  fetching: boolean
  canCreateRequest: boolean
  onPageChange: (current: number, pageSize: number) => void
  /** 跳转创建采购申请补货（采购员动作）。 */
  onCreateRequest: (record: StockAlertRecord) => void
}

/** 安全库存预警列表：当前库存 ≤ 安全库存的库存行，整行淡红高亮。 */
export function StockAlertTable({
  data,
  loading,
  fetching,
  canCreateRequest,
  onPageChange,
  onCreateRequest,
}: StockAlertTableProps) {
  const columns: ColumnsType<StockAlertRecord> = [
    {
      title: '商品',
      dataIndex: 'productName',
      width: 220,
      ellipsis: true,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <span>{value}</span>
          <Typography.Text type="secondary" className="text-xs">
            {record.productCode}
          </Typography.Text>
        </Space>
      ),
    },
    { title: '规格', dataIndex: 'spec', width: 150, ellipsis: true },
    { title: '仓库', dataIndex: 'warehouseName', width: 110 },
    {
      title: '当前库存',
      dataIndex: 'quantity',
      width: 100,
      align: 'right',
      render: (value: number) => <span className="font-medium text-red-600">{value}</span>,
    },
    { title: '安全库存', dataIndex: 'safetyStock', width: 100, align: 'right' },
    {
      title: '差额',
      dataIndex: 'gap',
      width: 90,
      align: 'right',
      render: (value: number) => <span className="font-medium text-red-600">-{value}</span>,
    },
    {
      title: '最近入库时间',
      dataIndex: 'lastInboundAt',
      width: 170,
      render: (value?: string) => (
        <Typography.Text type="secondary">{value ? formatShortDateTime(value) : '—'}</Typography.Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_, record) =>
        canCreateRequest ? (
          <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => onCreateRequest(record)}>
            创建采购申请
          </Button>
        ) : null,
    },
  ]

  return (
    <Table<StockAlertRecord>
      rowKey={(record) => `${record.warehouseId}-${record.productId}`}
      size="small"
      columns={columns}
      dataSource={data?.lists ?? []}
      loading={loading || fetching}
      // 预警行淡红高亮（需求：高亮预警行）。
      rowClassName={() => 'bg-red-50/60'}
      scroll={{ x: 1080 }}
      pagination={{
        current: data?.current ?? 1,
        pageSize: data?.pageSize ?? 20,
        total: data ? toPaginationTotal(data.total, data.pageSize) : 0,
        showSizeChanger: false,
        showTotal: (total) => `共 ${total} 条`,
        onChange: onPageChange,
      }}
    />
  )
}
