import { Button, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PaginatedData } from '@/services/httpClient'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { StatusTag } from '@/components/common/StatusTag'
import type { SupplierRecord } from '@/features/supplier/types'
import { formatMoney, maskPhone, toPaginationTotal } from '@/utils'

interface SupplierTableProps {
  data: PaginatedData<SupplierRecord> | null
  /** 首次加载 loading（翻页时保留旧数据，只做轻量 isFetching 提示）。 */
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  onView: (supplier: SupplierRecord) => void
  onEdit: (supplier: SupplierRecord) => void
  onToggleStatus: (supplier: SupplierRecord) => void
}

/**
 * 供应商列表表格：电话脱敏、门户账号标记与行内操作。
 *
 * - 门户账号与用户表的供应商账号按名称关联（MVP 一对一口径），仅在详情展示完整账号名；
 * - 按钮按权限码条件渲染（supplier:list:*）；无删除入口——供应商只允许停用。
 */
export function SupplierTable({
  data,
  loading,
  fetching,
  onPageChange,
  onView,
  onEdit,
  onToggleStatus,
}: SupplierTableProps) {
  const { has } = usePermissions()
  const canEdit = has('supplier:list:update')
  const canToggle = has('supplier:list:toggle-status')

  const columns: ColumnsType<SupplierRecord> = [
    {
      title: '供应商编码',
      dataIndex: 'code',
      width: 120,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: '供应商名称',
      dataIndex: 'name',
      width: 240,
      render: (name: string) => <Typography.Text className="block truncate">{name}</Typography.Text>,
    },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    {
      title: '联系电话',
      dataIndex: 'phone',
      width: 140,
      // 列表统一脱敏展示，完整号码在详情页查看。
      render: (phone: string) => <Typography.Text type="secondary">{maskPhone(phone)}</Typography.Text>,
    },
    {
      title: '在途订单',
      dataIndex: 'pendingOrderCount',
      width: 90,
      align: 'right',
      render: (count: number) => (count > 0 ? <Typography.Text strong>{count}</Typography.Text> : '—'),
    },
    {
      title: '累计采购额',
      dataIndex: 'totalPurchaseAmount',
      width: 120,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '门户账号',
      key: 'portal',
      width: 100,
      render: (_, record) =>
        record.portalUsername ? (
          <Tooltip title={`门户账号 ${record.portalUsername} 已开通`}>
            <Tag color="green">已开通</Tag>
          </Tooltip>
        ) : (
          <Typography.Text type="secondary">未开通</Typography.Text>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: SupplierRecord['status']) => <StatusTag status={status} />,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 140,
      render: (_, record) => (
        <Space size={0} split={<Typography.Text type="secondary">|</Typography.Text>}>
          <Button type="link" size="small" onClick={() => onView(record)}>
            查看
          </Button>
          {canEdit ? (
            <Button type="link" size="small" onClick={() => onEdit(record)}>
              编辑
            </Button>
          ) : null}
          {canToggle ? (
            <Popconfirm
              title={record.status === 1 ? '停用供应商' : '启用供应商'}
              description={
                record.status === 1 ? '停用后不可被新采购订单引用，历史订单不受影响。' : '启用后可重新被采购订单引用。'
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
        </Space>
      ),
    },
  ]

  return (
    <Table<SupplierRecord>
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
