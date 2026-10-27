import { Button, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ApprovalTask } from '@/features/approval/types'
import type { PaginatedData } from '@/services/httpClient'
import { formatMoney, formatShortDateTime, toPaginationTotal } from '@/utils'

interface ApprovalTaskTableProps {
  data: PaginatedData<ApprovalTask> | null
  /** 首次加载 loading（翻页时保留旧数据，只做轻量 isFetching 提示）。 */
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  /** 去审批：进入详情 + 裁决面板。 */
  onReview: (task: ApprovalTask) => void
}

/**
 * 我的审批待办表格：列表已按提交时间升序（先到先审），行内唯一动作是去审批。
 * 状态列固定展示「待审批」标签——待办池本身即状态过滤的口径。
 */
export function ApprovalTaskTable({ data, loading, fetching, onPageChange, onReview }: ApprovalTaskTableProps) {
  const columns: ColumnsType<ApprovalTask> = [
    {
      title: '申请编号',
      dataIndex: 'code',
      width: 150,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: '申请主题',
      dataIndex: 'title',
      width: 260,
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
      title: '提交时间',
      dataIndex: 'submittedAt',
      width: 130,
      render: (value: string) => <span>{formatShortDateTime(value)}</span>,
    },
    {
      title: '状态',
      key: 'status',
      width: 90,
      render: () => <Tag color="warning">待审批</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, task) => (
        <Button type="link" size="small" onClick={() => onReview(task)}>
          去审批
        </Button>
      ),
    },
  ]

  return (
    <Table<ApprovalTask>
      rowKey="id"
      columns={columns}
      dataSource={data?.lists ?? []}
      loading={loading}
      rowClassName={() => (fetching ? 'opacity-70' : '')}
      scroll={{ x: 1030 }}
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
