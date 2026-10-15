import { Button, Popconfirm, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PaginatedData } from '@/services/httpClient'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { StatusTag } from '@/components/common/StatusTag'
import type { ProductRecord } from '@/features/product/types'
import { formatMoney, toPaginationTotal } from '@/utils'

interface ProductTableProps {
  data: PaginatedData<ProductRecord> | null
  /** 首次加载 loading（翻页时保留旧数据，只做轻量 isFetching 提示）。 */
  loading: boolean
  fetching: boolean
  /** id → 「一级 / 二级 / 三级」分类路径映射。 */
  categoryPathOf: (id: string) => string
  onPageChange: (current: number, pageSize: number) => void
  onView: (product: ProductRecord) => void
  onEdit: (product: ProductRecord) => void
  onToggleStatus: (product: ProductRecord) => void
}

/**
 * 商品列表表格：预警行整行高亮 + 行内操作。
 *
 * 预警口径：当前总库存 < 安全库存（红色数字 + 「库存预警」标签）；
 * 按钮按权限码条件渲染（product:list:*），无删除入口——商品只允许停用。
 */
export function ProductTable({
  data,
  loading,
  fetching,
  categoryPathOf,
  onPageChange,
  onView,
  onEdit,
  onToggleStatus,
}: ProductTableProps) {
  const { has } = usePermissions()
  const canEdit = has('product:list:update')
  const canToggle = has('product:list:toggle-status')

  const columns: ColumnsType<ProductRecord> = [
    {
      title: '商品编码',
      dataIndex: 'code',
      width: 175,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      width: 230,
      render: (_, record) => (
        <div className="min-w-0">
          <Typography.Text className="block truncate">{record.name}</Typography.Text>
          <Typography.Text type="secondary" className="block truncate text-xs">
            {record.spec}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      width: 170,
      render: (_, record) => (
        <Typography.Text type="secondary" className="text-xs">
          {categoryPathOf(record.categoryId)}
        </Typography.Text>
      ),
    },
    { title: '单位', dataIndex: 'unit', width: 70 },
    {
      title: '采购参考价',
      dataIndex: 'purchasePrice',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '销售参考价',
      dataIndex: 'salePrice',
      width: 110,
      align: 'right',
      render: (value?: number) =>
        value === undefined ? <Typography.Text type="secondary">—</Typography.Text> : `¥${formatMoney(value)}`,
    },
    {
      title: '总库存',
      dataIndex: 'totalStock',
      width: 130,
      render: (value: number, record) => {
        const warning = value < record.safetyStock
        return (
          <span className="flex items-center gap-1.5">
            <span className={warning ? 'font-medium text-red-600' : undefined}>{value}</span>
            {warning ? (
              <Tag className="mr-0" color="red">
                库存预警
              </Tag>
            ) : null}
          </span>
        )
      },
    },
    { title: '安全库存', dataIndex: 'safetyStock', width: 90, align: 'right' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: ProductRecord['status']) => <StatusTag status={status} />,
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
              title={record.status === 1 ? '停用商品' : '启用商品'}
              description={
                record.status === 1 ? '停用后不可被新单据引用，历史单据不受影响。' : '启用后可重新被单据引用。'
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
    <Table<ProductRecord>
      rowKey="id"
      columns={columns}
      dataSource={data?.lists ?? []}
      loading={loading}
      // 预警行淡红底色；翻页重新请求期间整表降透明度提示。
      rowClassName={(record) =>
        record.totalStock < record.safetyStock ? 'bg-red-50/60' : fetching ? 'opacity-70' : ''
      }
      scroll={{ x: 1240 }}
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
