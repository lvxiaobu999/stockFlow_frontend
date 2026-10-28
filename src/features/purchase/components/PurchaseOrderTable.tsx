import { Button, Popconfirm, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PaginatedData } from '@/services/httpClient'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { PurchaseOrderStatusTag } from '@/features/purchase/components/PurchaseOrderStatusTag'
import type { PurchaseOrderRecord } from '@/features/purchase/types'
import { canDeleteOrder, canSendOrder, canVoidOrder, isOrderEditable } from '@/features/purchase/utils/purchaseOrder'
import { formatMoney, formatShortDateTime, toPaginationTotal } from '@/utils'

interface PurchaseOrderTableProps {
  data: PaginatedData<PurchaseOrderRecord> | null
  /** 首次加载 loading（翻页时保留旧数据，只做轻量 isFetching 提示）。 */
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  onView: (record: PurchaseOrderRecord) => void
  onEdit: (record: PurchaseOrderRecord) => void
  onDelete: (record: PurchaseOrderRecord) => void
  /** 发送供应商 / 拒绝后重发（两者走同一动作接口）。 */
  onSend: (record: PurchaseOrderRecord) => void
  onVoid: (record: PurchaseOrderRecord) => void
}

/**
 * 采购订单列表表格：行内操作按状态机与权限码双重收敛——
 * 草稿（编辑 / 发送 / 删除）、待供应商确认（作废）、已拒绝（重发 / 作废）；
 * 查看对所有角色开放。已确认之后的推进（发货 / 收货 / 验收 / 付款结清）
 * 分别属供应商端与收货验收、付款模块，本列表只读展示状态。
 */
export function PurchaseOrderTable({
  data,
  loading,
  fetching,
  onPageChange,
  onView,
  onEdit,
  onDelete,
  onSend,
  onVoid,
}: PurchaseOrderTableProps) {
  const { has } = usePermissions()
  const canEdit = has('purchase:order:update')
  const canSend = has('purchase:order:send')
  const canDelete = has('purchase:order:delete')
  const canVoid = has('purchase:order:void')

  const columns: ColumnsType<PurchaseOrderRecord> = [
    {
      title: '订单编号',
      dataIndex: 'code',
      width: 150,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: '供应商',
      dataIndex: 'supplierName',
      width: 200,
      render: (name: string) => <Typography.Text className="block truncate">{name}</Typography.Text>,
    },
    {
      title: '来源申请',
      dataIndex: 'requestCode',
      width: 150,
      render: (code: string | undefined) =>
        code ? <Tag color="processing">{code}</Tag> : <Typography.Text type="secondary">线下补录</Typography.Text>,
    },
    { title: '采购员', dataIndex: 'purchaserName', width: 90 },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      width: 110,
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
      title: '创建时间',
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
      width: 200,
      render: (_, record) => (
        <Space size={0} split={<Typography.Text type="secondary">|</Typography.Text>}>
          <Button type="link" size="small" onClick={() => onView(record)}>
            查看
          </Button>
          {isOrderEditable(record.status) && canEdit ? (
            <Button type="link" size="small" onClick={() => onEdit(record)}>
              编辑
            </Button>
          ) : null}
          {canSendOrder(record.status) && canSend ? (
            <Button type="link" size="small" onClick={() => onSend(record)}>
              {record.status === 'rejected' ? '重新发送' : '发送供应商'}
            </Button>
          ) : null}
          {canDeleteOrder(record.status) && canDelete ? (
            <Popconfirm
              title="删除采购订单"
              description="草稿删除后不可恢复，来源申请将回到「已通过」。确认删除？"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => onDelete(record)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          ) : null}
          {canVoidOrder(record.status) && canVoid ? (
            <Button type="link" size="small" danger onClick={() => onVoid(record)}>
              作废
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
      scroll={{ x: 1280 }}
      pagination={{
        // 后端 total 口径是总页数，换算成 antd 需要的总条数。
        total: data ? toPaginationTotal(data.total, data.pageSize) : 0,
        current: data?.current ?? 1,
        pageSize: data?.pageSize ?? 20,
        onChange: onPageChange,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${Math.ceil(total / (data?.pageSize ?? 20))} 页`,
      }}
    />
  )
}
