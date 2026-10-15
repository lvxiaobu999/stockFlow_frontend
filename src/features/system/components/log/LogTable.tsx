import { Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PaginatedData } from '@/services/httpClient'
import type { OperationLogRecord } from '@/features/system/types'
import { formatDateTime, toPaginationTotal } from '@/utils'

interface LogTableProps {
  data: PaginatedData<OperationLogRecord> | null
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
}

/** 审计日志表格：纯只读，无行内操作列；成功 / 失败用语义色标签。 */
export function LogTable({ data, loading, fetching, onPageChange }: LogTableProps) {
  const columns: ColumnsType<OperationLogRecord> = [
    {
      title: '操作时间',
      dataIndex: 'operatedAt',
      width: 170,
      render: (value: string) => <Typography.Text type="secondary">{formatDateTime(value)}</Typography.Text>,
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      width: 100,
      render: (operator: string) => <Typography.Text strong>{operator}</Typography.Text>,
    },
    {
      title: '模块',
      dataIndex: 'moduleName',
      width: 110,
      render: (moduleName: string) => <Tag>{moduleName}</Tag>,
    },
    { title: '动作', dataIndex: 'action', width: 130 },
    {
      title: '对象',
      dataIndex: 'targetSummary',
      ellipsis: true,
      render: (summary: string) => <Typography.Text>{summary}</Typography.Text>,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 130,
      render: (ip: string) => <Typography.Text type="secondary">{ip}</Typography.Text>,
    },
    {
      title: '结果',
      dataIndex: 'success',
      width: 80,
      render: (success: boolean) => (success ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>),
    },
  ]

  return (
    <Table<OperationLogRecord>
      rowKey="id"
      columns={columns}
      dataSource={data?.lists ?? []}
      loading={loading}
      rowClassName={() => (fetching ? 'opacity-70' : '')}
      scroll={{ x: 960 }}
      pagination={{
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
