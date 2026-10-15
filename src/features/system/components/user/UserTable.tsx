import { Button, Popconfirm, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PaginatedData } from '@/services/httpClient'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { StatusTag } from '@/features/system/components/StatusTag'
import { roleTagColor } from '@/features/system/utils/roleTagColor'
import type { UserRecord } from '@/features/system/types'
import { formatShortDateTime, maskPhone, toPaginationTotal } from '@/utils'

interface UserTableProps {
  data: PaginatedData<UserRecord> | null
  /** 首次加载 loading（翻页时保留旧数据，只做轻量 isFetching 提示）。 */
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  onEdit: (user: UserRecord) => void
  onResetPassword: (user: UserRecord) => void
  onToggleStatus: (user: UserRecord) => void
}

/** 用户类型 → 标签映射。 */
const USER_TYPE_META = {
  staff: { label: '内部员工', color: 'blue' },
  supplier: { label: '供应商', color: 'green' },
} as const

/**
 * 用户列表表格：脱敏手机号、角色标签、状态与行内操作。
 *
 * 按钮按权限码条件渲染（system:user:*），无权限的按钮直接不出现；
 * 内置账号（admin）不提供「停用」入口，与后端 4004 保护双重兜底。
 */
export function UserTable({
  data,
  loading,
  fetching,
  onPageChange,
  onEdit,
  onResetPassword,
  onToggleStatus,
}: UserTableProps) {
  const { has } = usePermissions()
  const canEdit = has('system:user:update')
  const canResetPassword = has('system:user:reset-password')
  const canToggleStatus = has('system:user:toggle-status')

  const columns: ColumnsType<UserRecord> = [
    {
      title: '账号',
      dataIndex: 'username',
      width: 150,
      render: (username: string, record) => (
        <Space size={6}>
          <Typography.Text copyable={{ text: username }}>{username}</Typography.Text>
          {record.builtin ? <Tag color="gold">内置</Tag> : null}
        </Space>
      ),
    },
    { title: '姓名', dataIndex: 'name', width: 110 },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 130,
      // 列表统一脱敏展示，完整号码只在需要时通过复制账号另行查询。
      render: (phone: string) => <Typography.Text type="secondary">{maskPhone(phone)}</Typography.Text>,
    },
    {
      title: '部门',
      dataIndex: 'department',
      width: 110,
      render: (department?: string) => department ?? '—',
    },
    {
      title: '类型',
      dataIndex: 'userType',
      width: 100,
      render: (userType: keyof typeof USER_TYPE_META) => {
        const meta = USER_TYPE_META[userType]
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '角色',
      dataIndex: 'roles',
      render: (_, record) => (
        <Space size={4} wrap>
          {record.roles.map((role) => (
            <Tag key={role.code} color={roleTagColor(role.code)}>
              {role.name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: UserRecord['status']) => <StatusTag status={status} />,
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      width: 110,
      render: (value?: string) => <Typography.Text type="secondary">{formatShortDateTime(value)}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size={0} split={<Typography.Text type="secondary">|</Typography.Text>}>
          {canEdit ? (
            <Button type="link" size="small" onClick={() => onEdit(record)}>
              编辑
            </Button>
          ) : null}
          {canResetPassword ? (
            <Popconfirm
              title="重置密码"
              description="重置为系统默认密码，用户下次登录后请尽快修改。"
              okText="重置"
              onConfirm={() => onResetPassword(record)}
            >
              <Button type="link" size="small">
                重置密码
              </Button>
            </Popconfirm>
          ) : null}
          {canToggleStatus && !record.builtin ? (
            <Popconfirm
              title={record.status === 1 ? '停用账号' : '启用账号'}
              description={record.status === 1 ? '停用后该账号将无法登录，确认停用？' : '启用后该账号即可重新登录。'}
              okText={record.status === 1 ? '停用' : '启用'}
              okButtonProps={record.status === 1 ? { danger: true } : undefined}
              onConfirm={() => onToggleStatus(record)}
            >
              <Button type="link" size="small" danger={record.status === 1}>
                {record.status === 1 ? '停用' : '启用'}
              </Button>
            </Popconfirm>
          ) : null}
          {!canEdit && !canResetPassword && !(canToggleStatus && !record.builtin) ? (
            <Typography.Text type="secondary">—</Typography.Text>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <Table<UserRecord>
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
        showQuickJumper: true,
        showTotal: (total) => `共 ${Math.ceil(total / (data?.pageSize ?? 20))} 页`,
      }}
    />
  )
}
