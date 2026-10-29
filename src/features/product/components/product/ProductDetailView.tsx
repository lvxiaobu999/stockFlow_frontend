import { Alert, Button, Card, Descriptions, Space, Spin, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/common/StatusTag'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import {
  useProductDetail,
  useProductStockSummary,
  useProductStockTransactions,
} from '@/features/product/hooks/useProducts'
import type { ProductStockSummaryRow, ProductStockTransaction } from '@/features/product/types'
import { formatDateTime, formatMoney } from '@/utils'

interface ProductDetailViewProps {
  id: string
  /** 分类 id → 「一级 / 二级 / 三级」路径解析（页面统一传入）。 */
  categoryPathOf: (categoryId: string) => string
  onBack: () => void
  onEdit: () => void
}

/** 库存流水类型 → 标签映射：入库绿、出库红。 */
const TRANSACTION_TYPE_META = {
  in: { label: '入库', color: 'green' },
  out: { label: '出库', color: 'red' },
} as const

/**
 * 商品详情视图：概要信息 + 库存汇总（按仓库）+ 最近库存流水。
 *
 * 库存两块由库存模块提供真实数据（库存行 / 流水联表组装），
 * 接口路径与结构即最终契约。
 */
export function ProductDetailView({ id, categoryPathOf, onBack, onEdit }: ProductDetailViewProps) {
  const { has } = usePermissions()
  const { data: product, isLoading, error } = useProductDetail(id)
  const { data: summary } = useProductStockSummary(id)
  const { data: transactions } = useProductStockTransactions(id, 5)

  const categoryPath = product ? categoryPathOf(product.categoryId) : ''

  if (isLoading && !product) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="商品详情加载中">
          <Spin size="large" />
        </div>
      </div>
    )
  }
  if (error || !product) {
    return (
      <div className="dashboard-page">
        <Alert
          type="error"
          showIcon
          message="商品详情加载失败"
          description={error?.message ?? '商品不存在或已被移除'}
          action={<Button onClick={onBack}>返回列表</Button>}
        />
      </div>
    )
  }

  const summaryColumns: ColumnsType<ProductStockSummaryRow> = [
    { title: '仓库', dataIndex: 'warehouseName', width: 160 },
    {
      title: '库存数量',
      dataIndex: 'stock',
      width: 120,
      align: 'right',
      render: (value: number, record) => (
        <span className={record.warning ? 'font-medium text-red-600' : undefined}>{value}</span>
      ),
    },
    {
      title: '库存状态',
      key: 'warning',
      width: 110,
      render: (_, record) => (record.warning ? <Tag color="red">低于安全库存</Tag> : <Tag color="green">正常</Tag>),
    },
    {
      title: '最近变动',
      dataIndex: 'lastChangeAt',
      render: (value?: string) => <Typography.Text type="secondary">{formatDateTime(value)}</Typography.Text>,
    },
  ]

  const transactionColumns: ColumnsType<ProductStockTransaction> = [
    {
      title: '发生时间',
      dataIndex: 'occurredAt',
      width: 170,
      render: (value: string) => <Typography.Text type="secondary">{formatDateTime(value)}</Typography.Text>,
    },
    {
      title: '仓库',
      dataIndex: 'warehouseName',
      width: 100,
      render: (value?: string) => value ?? '—',
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      render: (type: ProductStockTransaction['type']) => {
        const meta = TRANSACTION_TYPE_META[type]
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 100,
      align: 'right',
      render: (value: number, record) => (
        <span className={record.type === 'out' ? 'text-red-600' : 'text-green-700'}>
          {record.type === 'out' ? `-${value}` : `+${value}`}
        </span>
      ),
    },
    { title: '变动后库存', dataIndex: 'afterStock', width: 110, align: 'right' },
    {
      title: '关联单据',
      dataIndex: 'relatedOrderNo',
      render: (value?: string) => value ?? '—',
    },
    { title: '操作人', dataIndex: 'operator', width: 100 },
  ]

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <Space size={8}>
            <Typography.Title level={2} className="mb-0!">
              {product.name}
            </Typography.Title>
            <StatusTag status={product.status} />
          </Space>
          <Typography.Text type="secondary" className="block">
            {product.code} · {categoryPath}
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
          </Button>
          {has('product:list:update') ? (
            <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
              编辑
            </Button>
          ) : null}
        </Space>
      </div>

      <Card size="small" title="基本信息" className="mt-4">
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small">
          <Descriptions.Item label="商品编码">
            <Typography.Text copyable={{ text: product.code }}>{product.code}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="商品分类">{categoryPath}</Descriptions.Item>
          <Descriptions.Item label="计量单位">{product.unit}</Descriptions.Item>
          <Descriptions.Item label="规格型号">{product.spec}</Descriptions.Item>
          <Descriptions.Item label="采购参考价">¥{formatMoney(product.purchasePrice)}</Descriptions.Item>
          <Descriptions.Item label="销售参考价">
            {product.salePrice === undefined ? (
              <Typography.Text type="secondary">—（预留字段）</Typography.Text>
            ) : (
              `¥${formatMoney(product.salePrice)}`
            )}
          </Descriptions.Item>
          <Descriptions.Item label="安全库存">{product.safetyStock}</Descriptions.Item>
          <Descriptions.Item label="当前总库存">
            <span className={product.totalStock < product.safetyStock ? 'font-medium text-red-600' : undefined}>
              {product.totalStock}
            </span>
            {product.totalStock < product.safetyStock ? (
              <Tag className="ml-1.5" color="red">
                库存预警
              </Tag>
            ) : null}
          </Descriptions.Item>
          <Descriptions.Item label="建档 / 更新时间">
            <Typography.Text type="secondary">
              {formatDateTime(product.createdAt)} / {formatDateTime(product.updatedAt)}
            </Typography.Text>
          </Descriptions.Item>
          {product.description ? (
            <Descriptions.Item label="商品描述" span={3}>
              {product.description}
            </Descriptions.Item>
          ) : null}
        </Descriptions>
        {product.imageUrl ? (
          <div className="mt-2">
            <Typography.Text type="secondary" className="mr-2 text-xs">
              商品主图
            </Typography.Text>
            <img
              alt={`${product.name} 主图`}
              src={product.imageUrl}
              className="h-24 w-24 rounded border border-slate-200 object-cover"
            />
          </div>
        ) : null}
      </Card>

      <Card size="small" title="库存汇总（按仓库）" className="mt-4">
        {summary ? (
          <Table<ProductStockSummaryRow>
            rowKey="warehouseId"
            size="small"
            pagination={false}
            columns={summaryColumns}
            dataSource={summary.rows}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <Typography.Text strong>合计</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Typography.Text strong>{summary.totalStock}</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Typography.Text type="secondary">安全库存 {summary.safetyStock}</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} colSpan={2}>
                    <span />
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        ) : (
          <Spin />
        )}
      </Card>

      <Card size="small" title="最近库存流水（5 条）" className="mt-4">
        {transactions ? (
          <Table<ProductStockTransaction>
            rowKey="id"
            size="small"
            pagination={false}
            columns={transactionColumns}
            dataSource={transactions}
          />
        ) : (
          <Spin />
        )}
      </Card>
    </div>
  )
}
