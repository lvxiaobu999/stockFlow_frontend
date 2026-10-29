import { useState } from 'react'
import { Alert, App, Button, Space, Spin, Typography } from 'antd'
import { DownloadOutlined, ReloadOutlined, SwapOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { downloadCsv } from '@/utils/csv'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { StockAdjustModal } from '@/features/inventory/components/StockAdjustModal'
import { StockFilterBar, type StockFilters } from '@/features/inventory/components/StockFilterBar'
import { StockTable } from '@/features/inventory/components/StockTable'
import { useStocks } from '@/features/inventory/hooks/useStockQueries'
import { calcStockAmount } from '@/features/inventory/utils/stock'
import type { StockRecord } from '@/features/inventory/types'

/**
 * 当前库存页面：仓库 + 商品维度的实时库存台账。
 * 库存数量由流水推导（验收入库 / 库存调整），页面提供调整入口与流水下钻；
 * 「查看商品详情」待商品页视图态 URL 化后接入（偏差记录见 docs）。
 */

/** 导出当前页 CSV 的表头（与列表列同序，MVP 只导当前筛选 + 当前页）。 */
const EXPORT_HEADER = [
  '仓库',
  '商品编码',
  '商品名称',
  '规格',
  '单位',
  '当前库存',
  '安全库存',
  '库存金额',
  '最近变动时间',
]

function toExportRows(records: StockRecord[]) {
  return records.map((record) => [
    record.warehouseName,
    record.productCode,
    record.productName,
    record.spec,
    record.unit,
    record.quantity,
    record.safetyStock,
    calcStockAmount(record.quantity, record.purchasePrice).toFixed(2),
    record.updatedAt,
  ])
}

export default function CurrentStockPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { has } = usePermissions()
  const canAdjust = has('inventory:stock:adjust')

  const [filters, setFilters] = useState<StockFilters>({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustInitial, setAdjustInitial] = useState<{ warehouseId?: string; productId?: string }>({})

  const { data, isLoading, isFetching, error, refetch } = useStocks({ ...filters, ...pagination })

  const handleSearch = (next: StockFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  /** 下钻该仓库 + 商品的库存流水（深链参数由流水页承接）。 */
  const handleFlow = (record: StockRecord) => {
    navigate(`${routeMeta.stockTransactions.path}?warehouseId=${record.warehouseId}&productId=${record.productId}`)
  }

  const handleExport = () => {
    if (!data || data.lists.length === 0) {
      message.warning('当前页没有可导出的数据')
      return
    }
    downloadCsv(`当前库存_${Date.now()}.csv`, EXPORT_HEADER, toExportRows(data.lists))
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {routeMeta.currentStock.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {routeMeta.currentStock.description}
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出 CSV
          </Button>
          {canAdjust ? (
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => {
                setAdjustInitial({})
                setAdjustOpen(true)
              }}
            >
              库存调整
            </Button>
          ) : null}
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
          message="库存列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <StockFilterBar onSearch={handleSearch} />
      <div className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="库存列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <StockTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            canAdjust={canAdjust}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onAdjust={(record) => {
              setAdjustInitial({ warehouseId: record.warehouseId, productId: record.productId })
              setAdjustOpen(true)
            }}
            onFlow={handleFlow}
          />
        )}
      </div>
      {/* 预警口径提示（≤ 安全库存即预警），帮助理解列表中的红色行。 */}
      <Typography.Text type="secondary" className="mt-3 block text-xs">
        库存金额按采购参考价估算；当前库存 ≤ 安全库存判定为预警。库存数量只能由入库 / 调整流水推导更新。
      </Typography.Text>
      <StockAdjustModal open={adjustOpen} initialValues={adjustInitial} onClose={() => setAdjustOpen(false)} />
    </>
  )
}
