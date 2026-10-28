import { Alert, Button, Card, Col, Row, Space, Spin, Statistic, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { PurchaseOrderStatusTag } from '@/features/purchase/components/PurchaseOrderStatusTag'
import { usePortalOrders, usePortalSummary } from '@/features/supplier-portal/hooks/usePortalQueries'
import type { PurchaseOrderRecord } from '@/features/supplier-portal/types'
import { useAuthStore } from '@/stores/authStore'
import { formatMoney, formatShortDateTime } from '@/utils'

/**
 * 供应商门户首页：欢迎语 + 关键数字卡片（我的订单 / 待确认 / 待发货 / 本月发货）
 * + 待处理订单预览（最新 5 条待确认单，可直接进入处理）。
 * 数字卡片点击跳转对应列表页并预置状态页签。
 */
export default function SupplierPortalHomePage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.currentUser)
  const { data: summary, isLoading } = usePortalSummary()
  const {
    data: pendingOrders,
    isLoading: pendingLoading,
    error,
  } = usePortalOrders({ status: 'pending_supplier', current: 1, pageSize: 5 })

  const statCards = [
    {
      key: 'total',
      title: '我的采购订单',
      value: summary?.totalOrders,
      hint: '全部订单',
      to: routeMeta.supplierPortalMyOrders.path,
    },
    {
      key: 'pending',
      title: '待确认',
      value: summary?.pendingConfirm,
      hint: '需要尽快处理',
      to: `${routeMeta.supplierPortalMyOrders.path}?status=pending_supplier`,
    },
    {
      key: 'toShip',
      title: '待发货',
      value: summary?.toShip,
      hint: '已确认待发货',
      to: routeMeta.supplierPortalToShip.path,
    },
    {
      key: 'shipped',
      title: '本月发货',
      value: summary?.monthShipped,
      hint: '本月已发出的发货单',
      to: routeMeta.supplierPortalShipments.path,
    },
  ]

  const columns: ColumnsType<PurchaseOrderRecord> = [
    {
      title: '订单编号',
      dataIndex: 'code',
      width: 170,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      width: 120,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '期望交货',
      dataIndex: 'expectedDate',
      width: 110,
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      width: 130,
      render: (value: string) => formatShortDateTime(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status: PurchaseOrderRecord['status']) => <PurchaseOrderStatusTag status={status} />,
    },
    {
      title: '操作',
      key: 'actions',
      width: 90,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`${routeMeta.supplierPortalMyOrders.path}?action=detail&id=${record.id}`)}
        >
          去处理
        </Button>
      ),
    },
  ]

  return (
    <>
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>{`您好，${currentUser?.name ?? '合作伙伴'}`}</Typography.Title>
          <Typography.Text type="secondary">
            这里是与采购方协作的订单入口：确认订单、安排发货并跟踪发货记录。
          </Typography.Text>
        </div>
      </div>

      {isLoading ? (
        <div className="route-fallback" role="status" aria-label="门户统计加载中">
          <Spin size="large" />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {statCards.map((card) => (
            <Col key={card.key} xs={12} lg={6}>
              <Card
                size="small"
                hoverable
                className="cursor-pointer"
                onClick={() => navigate(card.to)}
                aria-label={`${card.title}（${card.hint}）`}
              >
                <Statistic title={card.title} value={card.value ?? 0} />
                <Typography.Text type="secondary" className="mt-1 block text-xs">
                  {card.hint}
                </Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card
        size="small"
        className="mt-4"
        title="待处理订单"
        extra={
          <Button type="link" size="small" onClick={() => navigate(routeMeta.supplierPortalMyOrders.path)}>
            查看全部
          </Button>
        }
      >
        {error ? (
          <Alert type="error" showIcon message="待处理订单加载失败" description={error.message} />
        ) : (
          <Space direction="vertical" className="w-full">
            <Table<PurchaseOrderRecord>
              rowKey="id"
              columns={columns}
              dataSource={pendingOrders?.lists ?? []}
              loading={pendingLoading}
              pagination={false}
              scroll={{ x: 720 }}
              locale={{ emptyText: '暂无待确认订单，有新订单时会出现在这里' }}
            />
          </Space>
        )}
      </Card>
    </>
  )
}
