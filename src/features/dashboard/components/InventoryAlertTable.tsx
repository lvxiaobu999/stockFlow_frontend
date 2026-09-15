import { Table, Tag, Typography } from 'antd'
import type { TableProps } from 'antd'
import type { InventoryAlert } from '@/features/dashboard/types'

const columns: TableProps<InventoryAlert>['columns'] = [
  { title: '商品', dataIndex: 'name', key: 'name' },
  { title: 'SKU', dataIndex: 'sku', key: 'sku' },
  {
    title: '当前库存',
    dataIndex: 'stock',
    key: 'stock',
    render: (value: number) => <Typography.Text strong>{value}</Typography.Text>,
  },
  { title: '安全库存', dataIndex: 'safeStock', key: 'safeStock' },
  {
    title: '状态',
    key: 'status',
    render: (_, record) => <Tag color="error">低于安全库存（{record.safeStock - record.stock}）</Tag>,
  },
]

export function InventoryAlertTable({ data }: { data: InventoryAlert[] }) {
  return <Table rowKey="id" columns={columns} dataSource={data} pagination={false} size="middle" />
}
