import { Button, Popconfirm, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PaginatedData } from '@/services/httpClient'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { StatusTag } from '@/components/common/StatusTag'
import type { RoleRecord } from '@/features/system/types'
import { formatDateTime, toPaginationTotal } from '@/utils'

interface RoleTableProps {
  data: PaginatedData<RoleRecord> | null
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  onEdit: (role: RoleRecord) => void
  onConfigure: (role: RoleRecord) => void
  onToggleStatus: (role: RoleRecord) => void
}

/**
 * 角色列表表格：用户数、状态与「编辑 / 配置权限 / 停用启用」行内操作。
 *
 * 内置角色（admin / supplier）不提供停用入口（后端 4003 双重兜底）；
 * 「配置权限」受 system:role:config 按钮权限控制。
 */
export function RoleTable({
  data,
  loading,
  fetching,
  onPageChange,
  onEdit,
  onConfigure,
  onToggleStatus,
}: RoleTableProps) {
  const { has } = usePermissions()
  const canEdit = has('system:role:update')
  const canConfigure = has('system:role:config')
  const canToggleStatus = has('system:role:toggle-status')

  const columns: ColumnsType<RoleRecord> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      width: 150,
      render: (name: string, record) => (
        <Space size={6}>
          <Typography.Text strong>{name}</Typography.Text>
          {record.builtin ? <Tag color="gold">内置</Tag> : null}
        </Space>
      ),
    },
    {
      title: '编码',
      dataIndex: 'code',
      width: 130,
      render: (code: string) => <Typography.Text code>{code}</Typography.Text>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (description?: string) => description ?? '—',
    },
    {
      title: '用户数',
      dataIndex: 'userCount',
      width: 90,
      align: 'right',
      render: (count: number) => <Typography.Text strong>{count}</Typography.Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: RoleRecord['status']) => <StatusTag status={status} />,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 170,
      render: (value: string) => <Typography.Text type="secondary">{formatDateTime(value)}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 220,
      render: (_, record) => (
        <Space size={0} split={<Typography.Text type="secondary">|</Typography.Text>}>
          {canConfigure ? (
            <Button type="link" size="small" onClick={() => onConfigure(record)}>
              配置权限
            </Button>
          ) : null}
          {canEdit ? (
            <Button type="link" size="small" onClick={() => onEdit(record)}>
              编辑
            </Button>
          ) : null}
          {canToggleStatus && !record.builtin ? (
            <Popconfirm
              title={record.status === 1 ? '停用角色' : '启用角色'}
              description={
                record.status === 1 ? '停用后不可再分配给用户，已有用户不受影响。' : '启用后可重新分配给用户。'
              }
              okText={record.status === 1 ? '停用' : '启用'}
              okButtonProps={record.status === 1 ? { danger: true } : undefined}
              onConfirm={() => onToggleStatus(record)}
            >
              <Button type="link" size="small" danger={record.status === 1}>
                {record.status === 1 ? '停用' : '启用'}
              </Button>
            </Popconfirm>
          ) : null}
          {!canConfigure && !canEdit && !(canToggleStatus && !record.builtin) ? (
            <Typography.Text type="secondary">—</Typography.Text>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <Table<RoleRecord>
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
        showTotal: (total) => `共 ${Math.ceil(total / (data?.pageSize ?? 20))} 页`,
      }}
    />
  )
}
