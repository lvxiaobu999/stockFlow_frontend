import { useState } from 'react'
import { Alert, Button, Card, Form, Select, Space, Spin, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { StockAlertTable } from '@/features/inventory/components/StockAlertTable'
import { useStockAlerts } from '@/features/inventory/hooks/useStockQueries'
import { useWarehouseOptions } from '@/features/inventory/hooks/useWarehouses'

/**
 * 安全库存预警页面：当前库存 ≤ 安全库存的库存行，缺口大的排前。
 * 预警行可跳转采购申请补货（采购员动作，需求标注「后续」的深链预填暂跳列表页）。
 */
export default function StockAlertPage() {
  const navigate = useNavigate()
  const { has } = usePermissions()
  const canCreateRequest = has('inventory:stock-alert:create-request')
  const { data: warehouseOptions } = useWarehouseOptions()

  const [warehouseId, setWarehouseId] = useState<string | undefined>()
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  const { data, isLoading, isFetching, error, refetch } = useStockAlerts({ warehouseId, ...pagination })

  const handleWarehouseChange = (value?: string) => {
    setWarehouseId(value)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {routeMeta.stockAlert.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {routeMeta.stockAlert.description}
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
          message="预警列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <Card size="small" className="filter-bar">
        <Form layout="inline">
          <Form.Item label="仓库">
            <Select
              placeholder="全部仓库"
              allowClear
              options={warehouseOptions}
              value={warehouseId}
              onChange={handleWarehouseChange}
              style={{ width: 160 }}
            />
          </Form.Item>
        </Form>
      </Card>
      <div className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="预警列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <StockAlertTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            canCreateRequest={canCreateRequest}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onCreateRequest={() => navigate(routeMeta.purchaseRequest.path)}
          />
        )}
      </div>
      <Typography.Text type="secondary" className="mt-3 block text-xs">
        预警口径：当前库存 ≤ 安全库存（商品级，全仓共用）；差额 = 安全库存 − 当前库存，缺得最多的排前面。
      </Typography.Text>
    </>
  )
}
