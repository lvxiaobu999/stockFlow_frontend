import { Button, Popconfirm, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PaginatedData } from '@/services/httpClient'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { PurchaseRequestStatusTag } from '@/features/purchase/components/PurchaseRequestStatusTag'
import type { PurchaseRequestRecord } from '@/features/purchase/types'
import { formatMoney, formatShortDateTime, toPaginationTotal } from '@/utils'

interface PurchaseRequestTableProps {
  data: PaginatedData<PurchaseRequestRecord> | null
  /** 首次加载 loading（翻页时保留旧数据，只做轻量 isFetching 提示）。 */
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  onView: (record: PurchaseRequestRecord) => void
  /** 编辑草稿 / 修改重提（两者都进表单视图）。 */
  onEdit: (record: PurchaseRequestRecord) => void
  onSubmit: (record: PurchaseRequestRecord) => void
  onWithdraw: (record: PurchaseRequestRecord) => void
  onDelete: (record: PurchaseRequestRecord) => void
  /** 生成订单 / 查看订单：采购订单模块的前置动作，页面统一提示未上线。 */
  onGenerateOrder: (record: PurchaseRequestRecord) => void
  onViewOrder: (record: PurchaseRequestRecord) => void
}

/**
 * 采购申请列表表格：行内操作按状态机与权限码双重收敛——
 * 草稿（编辑/提交/删除）、待审批（撤回）、已拒绝（修改重提）、
 * 已通过（生成订单）、已生成订单（查看订单）；查看对所有角色开放。
 */
export function PurchaseRequestTable({
  data,
  loading,
  fetching,
  onPageChange,
  onView,
  onEdit,
  onSubmit,
  onWithdraw,
  onDelete,
  onGenerateOrder,
  onViewOrder,
}: PurchaseRequestTableProps) {
  const { has } = usePermissions()
  const canEdit = has('purchase:request:update')
  const canSubmit = has('purchase:request:submit')
  const canWithdraw = has('purchase:request:withdraw')
  const canDelete = has('purchase:request:delete')
  const canGenerateOrder = has('purchase:request:generate-order')

  const columns: ColumnsType<PurchaseRequestRecord> = [
    {
      title: '申请编号',
      dataIndex: 'code',
      width: 150,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: '申请主题',
      dataIndex: 'title',
      width: 240,
      render: (title: string, record) => (
        <div className="min-w-0">
          <Typography.Text className="block truncate">{title}</Typography.Text>
          {record.orderedOrderCode ? (
            <Typography.Text type="secondary" className="block truncate text-xs">
              订单 {record.orderedOrderCode}
            </Typography.Text>
          ) : null}
        </div>
      ),
    },
    { title: '申请人', dataIndex: 'applicantName', width: 90 },
    { title: '部门', dataIndex: 'department', width: 90 },
    {
      title: '预计金额',
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
      title: '提交时间',
      dataIndex: 'submittedAt',
      width: 130,
      render: (value: string | undefined) =>
        value ? <span>{formatShortDateTime(value)}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: PurchaseRequestRecord['status']) => <PurchaseRequestStatusTag status={status} />,
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
          {record.status === 'draft' && canEdit ? (
            <Button type="link" size="small" onClick={() => onEdit(record)}>
              编辑
            </Button>
          ) : null}
          {record.status === 'draft' && canSubmit ? (
            <Button type="link" size="small" onClick={() => onSubmit(record)}>
              提交审批
            </Button>
          ) : null}
          {record.status === 'draft' && canDelete ? (
            <Popconfirm
              title="删除采购申请"
              description="草稿删除后不可恢复，确认删除？"
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
          {record.status === 'pending' && canWithdraw ? (
            <Popconfirm
              title="撤回采购申请"
              description="撤回后申请回到草稿态，可修改后重新提交。确认撤回？"
              okText="撤回"
              cancelText="取消"
              onConfirm={() => onWithdraw(record)}
            >
              <Button type="link" size="small">
                撤回
              </Button>
            </Popconfirm>
          ) : null}
          {record.status === 'rejected' && canEdit ? (
            <Button type="link" size="small" onClick={() => onEdit(record)}>
              修改重提
            </Button>
          ) : null}
          {record.status === 'approved' && canGenerateOrder ? (
            <Button type="link" size="small" onClick={() => onGenerateOrder(record)}>
              生成订单
            </Button>
          ) : null}
          {record.status === 'ordered' ? (
            <Button type="link" size="small" onClick={() => onViewOrder(record)}>
              查看订单
            </Button>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <Table<PurchaseRequestRecord>
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
        showQuickJumper: true,
        showTotal: (total) => `共 ${Math.ceil(total / (data?.pageSize ?? 20))} 页`,
      }}
    />
  )
}
