import { useState } from 'react'
import { Alert, App, Button, Space, Spin, Typography } from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { downloadCsv } from '@/utils/csv'
import {
  StockTransactionFilterBar,
  type StockTransactionFilters,
} from '@/features/inventory/components/StockTransactionFilterBar'
import { StockTransactionTable } from '@/features/inventory/components/StockTransactionTable'
import { useStockTransactions } from '@/features/inventory/hooks/useStockQueries'

/**
 * 库存流水页面：只增不改的审计台账（入库 / 出库 / 调整）。
 * 支持库存列表「查看流水」深链（?warehouseId=…&productId=…）：
 * 商品维度筛选由页面状态保持，不占用筛选栏表单项。
 */

/** 导出当前页 CSV 的表头（与列表列同序，MVP 只导当前筛选 + 当前页）。 */
const EXPORT_HEADER = [
  '发生时间',
  '类型',
  '数量',
  '变动后数量',
  '仓库',
  '商品编码',
  '商品名称',
  '相关单据',
  '备注',
  '操作人',
]

const TYPE_LABELS = { inbound: '入库', outbound: '出库', adjust: '调整' } as const

export default function StockTransactionsPage() {
  const { message } = App.useApp()
  const [searchParams] = useSearchParams()
  // 深链参数只在首次挂载读取一次；商品下钻筛选单独保持，避免被筛选栏重置。
  const [productId] = useState(() => searchParams.get('productId') ?? undefined)
  const [filters, setFilters] = useState<StockTransactionFilters>(() => ({
    warehouseId: searchParams.get('warehouseId') ?? undefined,
    keyword: searchParams.get('keyword') ?? undefined,
  }))
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  const { data, isLoading, isFetching, error, refetch } = useStockTransactions({
    ...filters,
    ...(productId ? { productId } : {}),
    ...pagination,
  })

  const handleSearch = (next: StockTransactionFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleExport = () => {
    if (!data || data.lists.length === 0) {
      message.warning('当前页没有可导出的数据')
      return
    }
    downloadCsv(
      `库存流水_${Date.now()}.csv`,
      EXPORT_HEADER,
      data.lists.map((record) => [
        record.createdAt,
        TYPE_LABELS[record.type],
        record.quantity,
        record.quantityAfter,
        record.warehouseName,
        record.productCode,
        record.productName,
        record.bizCode ?? '',
        record.remark ?? '',
        record.operatorName ?? '',
      ]),
    )
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {routeMeta.stockTransactions.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {routeMeta.stockTransactions.description}
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出 CSV
          </Button>
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
          message="库存流水加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <StockTransactionFilterBar initialValues={filters} onSearch={handleSearch} />
      <div className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="库存流水加载中">
            <Spin size="large" />
          </div>
        ) : (
          <StockTransactionTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
          />
        )}
      </div>
      <Typography.Text type="secondary" className="mt-3 block text-xs">
        流水只增不改，是库存数量的唯一合法来源；调整流水按变动方向以带符号数量呈现。
      </Typography.Text>
    </>
  )
}
