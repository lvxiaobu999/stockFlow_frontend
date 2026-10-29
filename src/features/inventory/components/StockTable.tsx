import { Button, Space, Table, Tag, Typography } from 'antd'
import { SwapOutlined, UnorderedListOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PaginatedData } from '@/services/httpClient'
import { formatShortDateTime, toPaginationTotal } from '@/utils'
import { calcStockAmount, isStockWarning } from '@/features/inventory/utils/stock'
import type { StockRecord } from '@/features/inventory/types'

interface StockTableProps {
  data: PaginatedData<StockRecord> | null
  loading: boolean
  /** 失效后的重新请求中，用于表格的轻量 loading。 */
  fetching: boolean
  canAdjust: boolean
  onPageChange: (current: number, pageSize: number) => void
  /** 发起库存调整（期初录入 / 纠错），行内预填仓库 + 商品。 */
  onAdjust: (record: StockRecord) => void
  /** 下钻该仓库 + 商品的库存流水。 */
  onFlow: (record: StockRecord) => void
}

/** 库存列表：仓库 + 商品维度的实时库存台账（预警行红色突出）。 */
export function StockTable({ data, loading, fetching, canAdjust, onPageChange, onAdjust, onFlow }: StockTableProps) {
  const columns: ColumnsType<StockRecord> = [
    { title: '仓库', dataIndex: 'warehouseName', width: 110 },
    {
      title: '商品编码',
      dataIndex: 'productCode',
      width: 160,
      render: (value: string) => <Typography.Text copyable={{ text: value }}>{value}</Typography.Text>,
    },
    { title: '商品名称', dataIndex: 'productName', width: 200, ellipsis: true },
    { title: '规格', dataIndex: 'spec', width: 150, ellipsis: true },
    { title: '单位', dataIndex: 'unit', width: 70 },
    {
      title: '当前库存',
      dataIndex: 'quantity',
      width: 110,
      align: 'right',
      render: (value: number, record) => (
        <span className={isStockWarning(value, record.safetyStock) ? 'font-medium text-red-600' : undefined}>
          {value}
        </span>
      ),
    },
    { title: '安全库存', dataIndex: 'safetyStock', width: 100, align: 'right' },
    {
      title: '库存状态',
      key: 'status',
      width: 100,
      render: (_, record) =>
        isStockWarning(record.quantity, record.safetyStock) ? (
          <Tag color="red">预警</Tag>
        ) : (
          <Tag color="green">正常</Tag>
        ),
    },
    {
      title: '库存金额',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (_, record) => <span>¥{calcStockAmount(record.quantity, record.purchasePrice).toFixed(2)}</span>,
    },
    {
      title: '最近变动时间',
      dataIndex: 'updatedAt',
      width: 170,
      render: (value: string) => <Typography.Text type="secondary">{formatShortDateTime(value)}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size={4}>
          {canAdjust ? (
            <Button type="link" size="small" icon={<SwapOutlined />} onClick={() => onAdjust(record)}>
              调整
            </Button>
          ) : null}
          <Button type="link" size="small" icon={<UnorderedListOutlined />} onClick={() => onFlow(record)}>
            查看流水
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Table<StockRecord>
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
