import { Button, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PaginatedData } from '@/services/httpClient'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { StatusTag } from '@/components/common/StatusTag'
import type { WarehouseRecord } from '@/features/inventory/types'
import { formatMoney, toPaginationTotal } from '@/utils'

interface WarehouseTableProps {
  data: PaginatedData<WarehouseRecord> | null
  /** 首次加载 loading（翻页时保留旧数据，只做轻量 isFetching 提示）。 */
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  onEdit: (warehouse: WarehouseRecord) => void
  onToggleStatus: (warehouse: WarehouseRecord) => void
}

/**
 * 仓库列表表格：负责人、库存统计列与行内操作。
 *
 * - 统计三列（商品种数 / 库存量 / 库存金额）为库存模块落地前的投影字段；
 * - 总仓为内置默认仓库：金色「总仓」标记 + 不提供停用入口（与后端 4403 双重兜底）；
 * - 按钮按权限码条件渲染（inventory:warehouse:*）；仓库无删除入口。
 */
export function WarehouseTable({ data, loading, fetching, onPageChange, onEdit, onToggleStatus }: WarehouseTableProps) {
  const { has } = usePermissions()
  const canEdit = has('inventory:warehouse:update')
  const canToggle = has('inventory:warehouse:toggle-status')

  const columns: ColumnsType<WarehouseRecord> = [
    {
      title: '仓库编码',
      dataIndex: 'code',
      width: 110,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: '仓库名称',
      dataIndex: 'name',
      width: 170,
      render: (name: string, record) => (
        <Space size={6}>
          <Typography.Text>{name}</Typography.Text>
          {record.isHeadquarters ? (
            <Tooltip title="总仓为默认仓库，不允许停用">
              <Tag color="gold">总仓</Tag>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'ownerName',
      width: 100,
      render: (ownerName?: string) => ownerName ?? <Typography.Text type="secondary">待分配</Typography.Text>,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      width: 130,
      render: (phone?: string) => <Typography.Text type="secondary">{phone ?? '—'}</Typography.Text>,
    },
    {
      title: '库存商品种数',
      dataIndex: 'stockSkuCount',
      width: 110,
      align: 'right',
    },
    {
      title: '库存总量',
      dataIndex: 'stockQuantity',
      width: 100,
      align: 'right',
    },
    {
      title: '库存金额',
      dataIndex: 'stockAmount',
      width: 120,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: WarehouseRecord['status']) => <StatusTag status={status} />,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 110,
      render: (_, record) => (
        <Space size={0} split={<Typography.Text type="secondary">|</Typography.Text>}>
          {canEdit ? (
            <Button type="link" size="small" onClick={() => onEdit(record)}>
              编辑
            </Button>
          ) : null}
          {canToggle && !record.isHeadquarters ? (
            <Popconfirm
              title={record.status === 1 ? '停用仓库' : '启用仓库'}
              description={
                record.status === 1
                  ? '停用后不可再作为新订单的收货仓库，历史单据不受影响。'
                  : '启用后可重新作为收货仓库。'
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
          {!canEdit && !(canToggle && !record.isHeadquarters) ? (
            <Typography.Text type="secondary">—</Typography.Text>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <Table<WarehouseRecord>
      rowKey="id"
      columns={columns}
      dataSource={data?.lists ?? []}
      loading={loading}
      rowClassName={() => (fetching ? 'opacity-70' : '')}
      scroll={{ x: 1100 }}
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
