import { Table, Tag, Typography } from 'antd'
import type { TableProps } from 'antd'
import type { InventoryAlert } from '@/features/dashboard/types'

// 预警表列定义；状态列是计算列，用差值直观展示缺货缺口。
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
    // 差值 = 安全库存 - 当前库存，即距离安全线还差多少件。
    render: (_, record) => <Tag color="error">低于安全库存（{record.safeStock - record.stock}）</Tag>,
  },
]

/** 库存预警表格：只读展示，关闭分页并居中排布。 */
export function InventoryAlertTable({ data }: { data: InventoryAlert[] }) {
  return <Table rowKey="id" columns={columns} dataSource={data} pagination={false} size="middle" />
}
