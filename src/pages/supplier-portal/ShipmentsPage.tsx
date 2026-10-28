import { useState } from 'react'
import { Alert, Button, Card, Descriptions, Input, Space, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { usePortalShipments } from '@/features/supplier-portal/hooks/usePortalQueries'
import type { ShipmentItem, ShipmentRecord } from '@/features/supplier-portal/types'
import { formatDateTime, toPaginationTotal } from '@/utils'

/**
 * 发货记录页面：已提交的发货单列表（按发货时间倒序）。
 * 明细以展开行承载——发货单数据量小且自包含，无需单设详情接口；
 * 「查看订单」跳转到我的采购订单详情。
 */
export default function ShipmentsPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const { data, isLoading, isFetching, error, refetch } = usePortalShipments({ keyword, ...pagination })

  const columns: ColumnsType<ShipmentRecord> = [
    {
      title: '发货单号',
      dataIndex: 'code',
      width: 170,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    {
      title: '关联订单',
      dataIndex: 'orderCode',
      width: 170,
      render: (code: string, record) => (
        <Button
          type="link"
          size="small"
          className="px-0"
          onClick={() => navigate(`${routeMeta.supplierPortalMyOrders.path}?action=detail&id=${record.orderId}`)}
        >
          {code}
        </Button>
      ),
    },
    {
      title: '物流公司',
      dataIndex: 'logisticsCompany',
      width: 140,
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">自送</Typography.Text>,
    },
    {
      title: '物流单号',
      dataIndex: 'trackingNo',
      width: 170,
      render: (value: string | undefined) =>
        value ? (
          <Typography.Text copyable={{ text: value }}>{value}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: '发货时间',
      dataIndex: 'shippedAt',
      width: 140,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作人',
      dataIndex: 'createdByName',
      width: 160,
      render: (value: string) => <Typography.Text className="block truncate">{value}</Typography.Text>,
    },
  ]

  /** 展开行：物流备注 + 发货明细（订购 / 实发数量对照）。 */
  const expandedRowRender = (record: ShipmentRecord) => (
    <div className="flex flex-col gap-3">
      <Descriptions column={3} size="small" className="mb-0">
        <Descriptions.Item label="发货备注">{record.remark ?? '—'}</Descriptions.Item>
      </Descriptions>
      <Table<ShipmentItem>
        rowKey="id"
        size="small"
        columns={itemColumns}
        dataSource={record.items}
        pagination={false}
      />
    </div>
  )

  return (
    <>
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {routeMeta.supplierPortalShipments.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {routeMeta.supplierPortalShipments.description}
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
          message="发货记录加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <Card size="small" className="filter-bar">
        <Space>
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="发货单号 / 关联订单号"
            allowClear
            style={{ width: 240 }}
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              // 输入即查回到第一页；请求由 keepPreviousData 承接避免闪烁。
              setPagination((prev) => ({ ...prev, current: 1 }))
            }}
          />
        </Space>
      </Card>
      <Card size="small" className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="发货记录加载中">
            <Spin size="large" />
          </div>
        ) : (
          <Table<ShipmentRecord>
            rowKey="id"
            columns={columns}
            expandable={{ expandedRowRender }}
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
            locale={{ emptyText: '暂无发货记录，填写发货后会在这里生成发货单' }}
          />
        )}
      </Card>
    </>
  )
}

/** 发货明细列（展开行内复用）。 */
const itemColumns: ColumnsType<ShipmentItem> = [
  {
    title: '商品',
    render: (_, item) => (
      <div className="min-w-0">
        <Typography.Text className="block truncate">{item.productName}</Typography.Text>
        <Typography.Text type="secondary" className="block truncate text-xs">
          {item.productCode} · {item.spec}
        </Typography.Text>
      </div>
    ),
  },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '订购数量', dataIndex: 'orderedQty', width: 100, align: 'right' },
  { title: '实发数量', dataIndex: 'shippedQty', width: 100, align: 'right' },
  {
    title: '行备注',
    dataIndex: 'remark',
    render: (value: string | undefined) =>
      value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
  },
]
