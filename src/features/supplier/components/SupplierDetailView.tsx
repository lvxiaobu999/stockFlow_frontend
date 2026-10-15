import { Alert, Button, Card, Descriptions, Space, Spin, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/common/StatusTag'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { useSupplierDetail, useSupplierRecentOrders } from '@/features/supplier/hooks/useSuppliers'
import type { SupplierRecentOrder } from '@/features/supplier/types'
import { formatDateTime, formatMoney, maskPhone } from '@/utils'

interface SupplierDetailViewProps {
  id: string
  onBack: () => void
  onEdit: () => void
}

/** 订单状态编码 → 标签颜色（采购模块状态枚举定稿前的中性过渡映射）。 */
const ORDER_STATUS_COLORS: Record<string, string> = {
  completed: 'green',
  received: 'cyan',
  sent: 'blue',
  pending_send: 'gold',
  cancelled: 'red',
}

/**
 * 供应商详情视图：档案概要 + 门户账号展示 + 近 5 笔订单（采购模块演示契约）。
 */
export function SupplierDetailView({ id, onBack, onEdit }: SupplierDetailViewProps) {
  const { has } = usePermissions()
  const { data: supplier, isLoading, error } = useSupplierDetail(id)
  const { data: orders } = useSupplierRecentOrders(id)

  if (isLoading && !supplier) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="供应商详情加载中">
          <Spin size="large" />
        </div>
      </div>
    )
  }
  if (error || !supplier) {
    return (
      <div className="dashboard-page">
        <Alert
          type="error"
          showIcon
          message="供应商详情加载失败"
          description={error?.message ?? '供应商不存在或已被移除'}
          action={<Button onClick={onBack}>返回列表</Button>}
        />
      </div>
    )
  }

  const columns: ColumnsType<SupplierRecentOrder> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      width: 150,
      render: (orderNo: string) => <Typography.Text copyable={{ text: orderNo }}>{orderNo}</Typography.Text>,
    },
    {
      title: '下单时间',
      dataIndex: 'placedAt',
      width: 170,
      render: (value: string) => <Typography.Text type="secondary">{formatDateTime(value)}</Typography.Text>,
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      width: 120,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '状态',
      dataIndex: 'statusName',
      width: 100,
      render: (_, record) => <Tag color={ORDER_STATUS_COLORS[record.statusCode] ?? 'default'}>{record.statusName}</Tag>,
    },
  ]

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <Space size={8}>
            <Typography.Title level={2} className="mb-0!">
              {supplier.name}
            </Typography.Title>
            <StatusTag status={supplier.status} />
          </Space>
          <Typography.Text type="secondary" className="block">
            {supplier.code} · 累计采购额 ¥{formatMoney(supplier.totalPurchaseAmount)}
            {supplier.pendingOrderCount > 0 ? ` · 在途 ${supplier.pendingOrderCount} 单` : ''}
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
          </Button>
          {has('supplier:list:update') ? (
            <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
              编辑
            </Button>
          ) : null}
        </Space>
      </div>

      <Card size="small" title="基本信息" className="mt-4">
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small">
          <Descriptions.Item label="供应商编码">
            <Typography.Text copyable={{ text: supplier.code }}>{supplier.code}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="联系人">{supplier.contactPerson}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{maskPhone(supplier.phone)}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{supplier.email ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="地址">{supplier.address ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="门户账号">
            {supplier.portalUsername ? (
              <Space size={6}>
                <Tag color="green">已开通</Tag>
                <Typography.Text copyable={{ text: supplier.portalUsername }}>
                  {supplier.portalUsername}
                </Typography.Text>
              </Space>
            ) : (
              <Typography.Text type="secondary">未开通（可在用户管理为该供应商创建账号）</Typography.Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="建档 / 更新时间">
            <Typography.Text type="secondary">
              {formatDateTime(supplier.createdAt)} / {formatDateTime(supplier.updatedAt)}
            </Typography.Text>
          </Descriptions.Item>
          {supplier.remark ? (
            <Descriptions.Item label="备注" span={3}>
              {supplier.remark}
            </Descriptions.Item>
          ) : null}
        </Descriptions>
      </Card>

      <Card size="small" title="银行与开票信息" className="mt-4">
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small">
          <Descriptions.Item label="开户银行">{supplier.bankName ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="银行账号">{supplier.bankAccount ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="纳税人识别号">{supplier.taxNo ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="近 5 笔采购订单（演示数据）">
        {orders ? (
          <Table<SupplierRecentOrder>
            rowKey="id"
            size="small"
            pagination={false}
            columns={columns}
            dataSource={orders}
          />
        ) : (
          <Spin />
        )}
      </Card>
    </div>
  )
}
