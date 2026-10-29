import { Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PaginatedData } from '@/services/httpClient'
import { formatShortDateTime, toPaginationTotal } from '@/utils'
import { STOCK_TRANSACTION_TYPE_META } from '@/features/inventory/types'
import type { StockTransactionRecord } from '@/features/inventory/types'

interface StockTransactionTableProps {
  data: PaginatedData<StockTransactionRecord> | null
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
}

/** 库存流水列表：入库绿 / 出库红 / 调整蓝；数量带符号展示（审计台账口径）。 */
export function StockTransactionTable({ data, loading, fetching, onPageChange }: StockTransactionTableProps) {
  const columns: ColumnsType<StockTransactionRecord> = [
    {
      title: '发生时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (value: string) => <Typography.Text type="secondary">{formatShortDateTime(value)}</Typography.Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      render: (type: StockTransactionRecord['type']) => {
        const meta = STOCK_TRANSACTION_TYPE_META[type]
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 100,
      align: 'right',
      render: (value: number) => (
        <span className={value < 0 ? 'text-red-600' : 'text-green-700'}>{value > 0 ? `+${value}` : value}</span>
      ),
    },
    { title: '变动后数量', dataIndex: 'quantityAfter', width: 110, align: 'right' },
    { title: '仓库', dataIndex: 'warehouseName', width: 100 },
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
    {
      title: '相关单据',
      dataIndex: 'bizCode',
      width: 170,
      render: (value?: string) => value ?? <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 200,
      ellipsis: true,
      render: (value?: string) => value ?? '—',
    },
    { title: '操作人', dataIndex: 'operatorName', width: 100 },
  ]

  return (
    <Table<StockTransactionRecord>
      rowKey="id"
      size="small"
      columns={columns}
      dataSource={data?.lists ?? []}
      loading={loading || fetching}
      scroll={{ x: 1280 }}
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
