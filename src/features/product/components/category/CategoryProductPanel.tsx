import { useState } from 'react'
import { Button, Card, Empty, Spin, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/common/StatusTag'
import { useProducts } from '@/features/product/hooks/useProducts'
import type { ProductRecord } from '@/features/product/types'
import { formatMoney, toPaginationTotal } from '@/utils'

interface CategoryProductPanelProps {
  /** 当前选中分类 id（空串表示尚未选中）。 */
  categoryId: string
  /** 展示名：完整路径（一级 / 二级 / 三级）。 */
  categoryPath: string
  /** 子树商品计数（分类树口径，可能大于下方直属+子孙分页总数展示）。 */
  productCount: number
}

/**
 * 分类面板右侧的商品联动表：展示所选分类（含子分类）下的商品。
 *
 * 刻意做成只读瘦身版（无操作列、无导出），完整维护入口在「商品列表」页，
 * 避免同一表格两处维护两套权限与交互。
 */
export function CategoryProductPanel({ categoryId, categoryPath, productCount }: CategoryProductPanelProps) {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const { data, isLoading, isFetching, refetch } = useProducts({
    categoryId: categoryId || undefined,
    ...pagination,
  })

  const columns: ColumnsType<ProductRecord> = [
    {
      title: '商品编码',
      dataIndex: 'code',
      width: 170,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      render: (_, record) => (
        <div className="min-w-0">
          <Typography.Text className="block truncate">{record.name}</Typography.Text>
          <Typography.Text type="secondary" className="block truncate text-xs">
            {record.spec}
          </Typography.Text>
        </div>
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
      title: '总库存',
      dataIndex: 'totalStock',
      width: 110,
      render: (value: number, record) => (
        <span className="flex items-center gap-1.5">
          <span className={value < record.safetyStock ? 'font-medium text-red-600' : undefined}>{value}</span>
          {value < record.safetyStock ? <Tag className="mr-0">低于安全库存 {record.safetyStock}</Tag> : null}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: ProductRecord['status']) => <StatusTag status={status} />,
    },
  ]

  return (
    <Card
      size="small"
      className="h-full"
      title={
        categoryPath ? (
          <span className="flex items-center gap-2">
            <Typography.Text className="font-medium">{categoryPath}</Typography.Text>
            <Tag color="blue">{productCount} 个商品</Tag>
          </span>
        ) : (
          '商品明细'
        )
      }
      extra={
        <Button icon={<ReloadOutlined />} size="small" onClick={() => void refetch()} disabled={!categoryId}>
          刷新
        </Button>
      }
    >
      {!categoryId ? (
        <Empty className="py-16" description="请先在左侧选择分类" />
      ) : isLoading && !data ? (
        <div className="route-fallback" role="status" aria-label="商品加载中">
          <Spin size="large" />
        </div>
      ) : (
        <Table<ProductRecord>
          rowKey="id"
          columns={columns}
          dataSource={data?.lists ?? []}
          loading={isLoading}
          rowClassName={(record) =>
            record.totalStock < record.safetyStock ? 'bg-red-50/60' : isFetching ? 'opacity-70' : ''
          }
          scroll={{ x: 760 }}
          pagination={{
            // 后端 total 口径是总页数，换算成 antd 需要的总条数。
            total: data ? toPaginationTotal(data.total, data.pageSize) : 0,
            current: data?.current ?? 1,
            pageSize: data?.pageSize ?? 10,
            onChange: (current, pageSize) => setPagination({ current, pageSize }),
            showSizeChanger: true,
            showTotal: (total) => `共 ${Math.ceil(total / (data?.pageSize ?? 10))} 页`,
          }}
        />
      )}
    </Card>
  )
}
