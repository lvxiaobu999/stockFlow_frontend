import { Button, Popconfirm, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { ReconciliationStatusTag } from './ReconciliationStatusTag'
import { formatMoney, formatShortDateTime, toPaginationTotal } from '@/utils'
import type { PaginatedData } from '@/services/httpClient'
import type { ReconciliationRecord } from '../types'

interface ReconciliationTableProps {
  data: PaginatedData<ReconciliationRecord> | null
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  onView: (record: ReconciliationRecord) => void
  /** 草稿进入编辑视图（需新建对账权限）。 */
  onEdit: (record: ReconciliationRecord) => void
  /** 待确认 / 有差异进入确认视图（需确认权限）。 */
  onConfirm: (record: ReconciliationRecord) => void
  /** 草稿直接提交（需新建对账权限，动作在父级执行）。 */
  onSubmit: (record: ReconciliationRecord) => void
  /** 已确认直接关闭（需关闭权限，动作在父级执行）。 */
  onClose: (record: ReconciliationRecord) => void
}

/**
 * 对账单列表：金额四件套 + 差异 + 状态，操作按状态机与按钮权限码收敛——
 * 草稿（编辑 / 提交）、待确认与有差异（确认）、已确认（关闭）。
 */
export function ReconciliationTable({
  data,
  loading,
  fetching,
  onPageChange,
  onView,
  onEdit,
  onConfirm,
  onSubmit,
  onClose,
}: ReconciliationTableProps) {
  const { has } = usePermissions()
  const canCreate = has('reconciliation:list:create')
  const canConfirm = has('reconciliation:list:confirm')
  const canClose = has('reconciliation:list:close')

  const columns: ColumnsType<ReconciliationRecord> = [
    {
      title: '对账单号',
      dataIndex: 'code',
      width: 165,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    { title: '供应商', dataIndex: 'supplierName', width: 150, ellipsis: true },
    {
      title: '对账期间',
      key: 'period',
      width: 190,
      render: (_, record) => `${record.periodStart} ~ ${record.periodEnd}`,
    },
    {
      title: '订单金额',
      dataIndex: 'orderAmount',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '应付金额',
      dataIndex: 'payableAmount',
      width: 110,
      align: 'right',
      render: (value: number) => <Typography.Text strong>¥{formatMoney(value)}</Typography.Text>,
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '待付金额',
      dataIndex: 'unpaidAmount',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '差异金额',
      dataIndex: 'diffAmount',
      width: 100,
      align: 'right',
      render: (value: number | undefined, record) =>
        record.status === 'disputed' && value !== undefined ? (
          <Typography.Text type="danger">¥{formatMoney(value)}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: ReconciliationRecord['status']) => <ReconciliationStatusTag status={status} />,
    },
    { title: '创建人', dataIndex: 'createdByName', width: 90 },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 130,
      render: (value: string) => formatShortDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 190,
      render: (_, record) => (
        <Space size={0} split={<Typography.Text type="secondary">|</Typography.Text>}>
          {record.status === 'draft' ? (
            <>
              <Button type="link" size="small" disabled={!canCreate} onClick={() => onEdit(record)}>
                编辑
              </Button>
              <Popconfirm
                title="提交后对账单进入待确认，财务核对前请确认明细无误"
                okText="提交"
                cancelText="取消"
                onConfirm={() => onSubmit(record)}
              >
                <Button type="link" size="small" disabled={!canCreate}>
                  提交
                </Button>
              </Popconfirm>
            </>
          ) : null}
          {record.status === 'pending' || record.status === 'disputed' ? (
            <Button type="link" size="small" disabled={!canConfirm} onClick={() => onConfirm(record)}>
              确认
            </Button>
          ) : null}
          {record.status === 'confirmed' ? (
            <Popconfirm
              title="关闭后对账单进入终态，不可再操作"
              description="请确认关联付款已完成或已人工核对完毕。"
              okText="关闭"
              cancelText="取消"
              onConfirm={() => onClose(record)}
            >
              <Button type="link" size="small" disabled={!canClose}>
                关闭
              </Button>
            </Popconfirm>
          ) : null}
          <Button type="link" size="small" onClick={() => onView(record)}>
            查看
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Table<ReconciliationRecord>
      rowKey="id"
      columns={columns}
      dataSource={data?.lists ?? []}
      loading={loading}
      rowClassName={() => (fetching ? 'opacity-70' : '')}
      scroll={{ x: 1500 }}
      pagination={{
        // 后端 total 口径是总页数，换算成 antd 需要的总条数。
        total: data ? toPaginationTotal(data.total, data.pageSize) : 0,
        current: data?.current ?? 1,
        pageSize: data?.pageSize ?? 20,
        onChange: onPageChange,
        showSizeChanger: true,
        showTotal: (total) => `共 ${Math.ceil(total / (data?.pageSize ?? 20))} 页`,
      }}
      locale={{ emptyText: '暂无对账单，可从待对账单据池发起对账' }}
    />
  )
}
