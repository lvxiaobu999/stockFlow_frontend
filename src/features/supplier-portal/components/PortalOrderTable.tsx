import { Button, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PaginatedData } from '@/services/httpClient'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { PurchaseOrderStatusTag } from '@/features/purchase/components/PurchaseOrderStatusTag'
import type { PurchaseOrderRecord } from '../types'
import { formatMoney, formatShortDateTime, toPaginationTotal } from '@/utils'

interface PortalOrderTableProps {
  data: PaginatedData<PurchaseOrderRecord> | null
  /** 首次加载 loading（翻页时保留旧数据，只做轻量 isFetching 提示）。 */
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  onView: (record: PurchaseOrderRecord) => void
  /** 确认 / 拒绝（仅待确认状态行出现）；父级负责打开对应弹窗。 */
  onConfirm: (record: PurchaseOrderRecord) => void
  onReject: (record: PurchaseOrderRecord) => void
  /** 去发货（仅已确认状态行出现）；父级跳转发货表单。 */
  onShip: (record: PurchaseOrderRecord) => void
}

/**
 * 门户「我的采购订单」列表：行内操作按状态机与按钮权限收敛——
 * 待确认（确认 / 拒绝）、已确认（去发货）；其余状态只读查看。
 * 供应商 / 采购员等采购方字段对门户无意义，不设列。
 */
export function PortalOrderTable({
  data,
  loading,
  fetching,
  onPageChange,
  onView,
  onConfirm,
  onReject,
  onShip,
}: PortalOrderTableProps) {
  const { has } = usePermissions()
  const canConfirm = has('supplier-portal:order:confirm')
  const canReject = has('supplier-portal:order:reject')
  const canShip = has('supplier-portal:order:ship')

  const columns: ColumnsType<PurchaseOrderRecord> = [
    {
      title: '订单编号',
      dataIndex: 'code',
      width: 170,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      width: 120,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '明细数',
      dataIndex: 'items',
      width: 80,
      align: 'right',
      render: (_, record) => record.items.length,
    },
    {
      title: '期望交货',
      dataIndex: 'expectedDate',
      width: 110,
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '预计发货',
      dataIndex: 'promisedShipDate',
      width: 110,
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      width: 130,
      render: (value: string) => formatShortDateTime(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status: PurchaseOrderRecord['status']) => <PurchaseOrderStatusTag status={status} />,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 170,
      render: (_, record) => (
        <Space size={0} split={<Typography.Text type="secondary">|</Typography.Text>}>
          <Button type="link" size="small" onClick={() => onView(record)}>
            查看
          </Button>
          {record.status === 'pending_supplier' && canConfirm ? (
            <Button type="link" size="small" onClick={() => onConfirm(record)}>
              确认
            </Button>
          ) : null}
          {record.status === 'pending_supplier' && canReject ? (
            <Button type="link" size="small" danger onClick={() => onReject(record)}>
              拒绝
            </Button>
          ) : null}
          {record.status === 'confirmed' && canShip ? (
            <Button type="link" size="small" onClick={() => onShip(record)}>
              去发货
            </Button>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <Table<PurchaseOrderRecord>
      rowKey="id"
      columns={columns}
      dataSource={data?.lists ?? []}
      loading={loading}
      rowClassName={() => (fetching ? 'opacity-70' : '')}
      scroll={{ x: 1080 }}
      pagination={{
        // 后端 total 口径是总页数，换算成 antd 需要的总条数。
        total: data ? toPaginationTotal(data.total, data.pageSize) : 0,
        current: data?.current ?? 1,
        pageSize: data?.pageSize ?? 20,
        onChange: onPageChange,
        showSizeChanger: true,
        showTotal: (total) => `共 ${Math.ceil(total / (data?.pageSize ?? 20))} 页`,
      }}
    />
  )
}
