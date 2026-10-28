import { useState } from 'react'
import { Alert, Button, Card, Space, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { ShipFormView } from '@/features/supplier-portal/components/ShipFormView'
import { usePortalOrders } from '@/features/supplier-portal/hooks/usePortalQueries'
import { PurchaseOrderStatusTag } from '@/features/purchase/components/PurchaseOrderStatusTag'
import type { PurchaseOrderRecord } from '@/features/supplier-portal/types'
import { formatMoney, formatShortDateTime, toPaginationTotal } from '@/utils'

/**
 * 待发货页面：已确认订单的处理工作台。
 * 列表固定展示 confirmed 状态；「填写发货」进入页内发货表单
 * （?action=ship&id=…，刷新不丢视图），发货成功后回到列表；
 * 「查看」跳转到我的采购订单的详情视图。
 */
export default function ToShipPage() {
  const navigate = useNavigate()
  const { has } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  // 发货表单视图：?action=ship&id=…
  const shipId = searchParams.get('action') === 'ship' ? (searchParams.get('id') ?? undefined) : undefined

  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const { data, isLoading, isFetching, error, refetch } = usePortalOrders({
    status: 'confirmed',
    ...pagination,
  })

  if (shipId) {
    return (
      <ShipFormView
        key={shipId}
        id={shipId}
        onCancel={() => setSearchParams({}, { replace: true })}
        onShipped={() => {
          // 发货成功回到列表（查询已随 mutation 失效刷新）。
          setSearchParams({}, { replace: true })
        }}
      />
    )
  }

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
      title: '明细数',
      dataIndex: 'items',
      width: 80,
      align: 'right',
      render: (_, record) => record.items.length,
    },
    {
      title: '确认时间',
      dataIndex: 'confirmedAt',
      width: 130,
      render: (value: string | undefined) =>
        value ? formatShortDateTime(value) : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '预计发货',
      dataIndex: 'promisedShipDate',
      width: 110,
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '期望交货',
      dataIndex: 'expectedDate',
      width: 110,
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: PurchaseOrderRecord['status']) => <PurchaseOrderStatusTag status={status} />,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size={0} split={<Typography.Text type="secondary">|</Typography.Text>}>
          <Button
            type="link"
            size="small"
            disabled={!has('supplier-portal:order:ship')}
            onClick={() => setSearchParams({ action: 'ship', id: record.id })}
          >
            填写发货
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`${routeMeta.supplierPortalMyOrders.path}?action=detail&id=${record.id}`)}
          >
            查看
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {routeMeta.supplierPortalToShip.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {routeMeta.supplierPortalToShip.description}
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
            刷新
          </Button>
        </Space>
      </div>
      {error ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message="待发货列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <Card size="small">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="待发货列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <Table<PurchaseOrderRecord>
            rowKey="id"
            columns={columns}
            dataSource={data?.lists ?? []}
            loading={isLoading}
            rowClassName={() => (isFetching ? 'opacity-70' : '')}
            scroll={{ x: 980 }}
            pagination={{
              // 后端 total 口径是总页数，换算成 antd 需要的总条数。
              total: data ? toPaginationTotal(data.total, data.pageSize) : 0,
              current: data?.current ?? 1,
              pageSize: data?.pageSize ?? 20,
              onChange: (current, pageSize) => setPagination({ current, pageSize }),
              showSizeChanger: true,
              showTotal: (total) => `共 ${Math.ceil(total / (data?.pageSize ?? 20))} 页`,
            }}
            locale={{ emptyText: '暂无待发货订单，确认采购订单后会出现在这里' }}
          />
        )}
      </Card>
    </>
  )
}
