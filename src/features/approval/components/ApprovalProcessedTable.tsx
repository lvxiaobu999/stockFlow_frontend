import { Button, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { APPROVAL_CONCLUSION_META, type ApprovalProcessedRecord } from '@/features/approval/types'
import type { PaginatedData } from '@/services/httpClient'
import { formatMoney, formatShortDateTime, toPaginationTotal } from '@/utils'

interface ApprovalProcessedTableProps {
  data: PaginatedData<ApprovalProcessedRecord> | null
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  /** 查看结论对应的单据详情（只读）。 */
  onView: (record: ApprovalProcessedRecord) => void
}

/**
 * 我已审批表格：当前登录用户名下的结论流水，行内展示我的结论与意见；
 * 单据详情入口为只读查看（结论已出，不再提供审批动作）。
 */
export function ApprovalProcessedTable({ data, loading, fetching, onPageChange, onView }: ApprovalProcessedTableProps) {
  const columns: ColumnsType<ApprovalProcessedRecord> = [
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
      render: (title: string) => (
        <Typography.Text className="block truncate" ellipsis={{ tooltip: title }}>
          {title}
        </Typography.Text>
      ),
    },
    { title: '申请人', dataIndex: 'applicantName', width: 90 },
    { title: '部门', dataIndex: 'department', width: 100 },
    {
      title: '预计金额',
      dataIndex: 'totalAmount',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '我的结论',
      dataIndex: 'action',
      width: 100,
      render: (action: ApprovalProcessedRecord['action']) => (
        // 结果标签与需求口径一致：通过绿 / 拒绝红。
        <Tag color={APPROVAL_CONCLUSION_META[action].color}>{APPROVAL_CONCLUSION_META[action].label}</Tag>
      ),
    },
    {
      title: '审批意见',
      dataIndex: 'comment',
      width: 200,
      render: (comment: string | undefined, record) =>
        comment ? (
          <Typography.Text className="block truncate" ellipsis={{ tooltip: comment }}>
            {comment}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">
            {APPROVAL_CONCLUSION_META[record.action].label}（未填意见）
          </Typography.Text>
        ),
    },
    {
      title: '结论时间',
      dataIndex: 'createdAt',
      width: 130,
      render: (value: string) => <span>{formatShortDateTime(value)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Space size={0} split={<Typography.Text type="secondary">|</Typography.Text>}>
          <Button type="link" size="small" onClick={() => onView(record)}>
            查看
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Table<ApprovalProcessedRecord>
      rowKey="id"
      columns={columns}
      dataSource={data?.lists ?? []}
      loading={loading}
      rowClassName={() => (fetching ? 'opacity-70' : '')}
      scroll={{ x: 1200 }}
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
