import { Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PurchaseOrderItem } from '../types'
import { formatMoney } from '@/utils'

interface PortalOrderItemsTableProps {
  items: PurchaseOrderItem[]
  totalAmount: number
}

/**
 * 门户订单明细表（只读）：供应商视角关注「发什么、发多少」，
 * 单价与金额仅作对账参考展示；行快照由采购方下单时生成。
 */
export function PortalOrderItemsTable({ items, totalAmount }: PortalOrderItemsTableProps) {
  const columns: ColumnsType<PurchaseOrderItem> = [
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
    { title: '数量', dataIndex: 'quantity', width: 90, align: 'right' },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 160,
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
  ]

  return (
    <Table<PurchaseOrderItem>
      rowKey="id"
      columns={columns}
      dataSource={items}
      pagination={false}
      scroll={{ x: 720 }}
      summary={() => (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} colSpan={4}>
            <Typography.Text strong>订单金额（{items.length} 项）</Typography.Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={4} align="right">
            <Typography.Text strong>¥{formatMoney(totalAmount)}</Typography.Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={5}>
            <span> </span>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      )}
    />
  )
}
