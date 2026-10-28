import { useState } from 'react'
import { Alert, Button, Card, Space, Spin, Tabs, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { InspectionDetailView } from '@/features/receiving/components/InspectionDetailView'
import { InspectionFilterBar, type InspectionFilters } from '@/features/receiving/components/InspectionFilterBar'
import { InspectionFormView } from '@/features/receiving/components/InspectionFormView'
import { InspectionTable } from '@/features/receiving/components/InspectionTable'
import { useInspections } from '@/features/receiving/hooks/useReceivingQueries'
import type { InspectionResultFilter } from '@/features/receiving/types'

/**
 * 验收单页面：待验收工作台 + 验收台账（结论页签承载，视图态由 URL 查询参数驱动）。
 * 「去验收」进入页内验收操作视图（?action=inspect&id=…）；收货单页与
 * 采购订单详情关联单据可深链直达。
 */

/** 结论页签：全部 / 待验收 / 已验收（已验收 = 三种结论的 settled 合并口径）。 */
const RESULT_TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待验收' },
  { key: 'settled', label: '已验收' },
]

/** 判断 URL 上的 result 参数是否为合法的结论筛选值。 */
function isResultFilter(value: string | null): value is InspectionResultFilter {
  return (
    value === 'pending' ||
    value === 'settled' ||
    value === 'qualified' ||
    value === 'partial' ||
    value === 'unqualified'
  )
}

export default function InspectionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  // 视图态：?action=inspect&id=…（验收操作）/ ?action=detail&id=…（详情）。
  const inspectId = searchParams.get('action') === 'inspect' ? (searchParams.get('id') ?? undefined) : undefined
  const detailId = searchParams.get('action') === 'detail' ? (searchParams.get('id') ?? undefined) : undefined
  const initialResult = searchParams.get('result')

  const [filters, setFilters] = useState<InspectionFilters>({})
  const [result, setResult] = useState<InspectionResultFilter | 'all'>(
    isResultFilter(initialResult) ? initialResult : 'all',
  )
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  const { data, isLoading, isFetching, error, refetch } = useInspections({
    ...filters,
    ...(result === 'all' ? {} : { result }),
    ...pagination,
  })

  /** 结论页签变化回到第一页，并同步到 URL 便于刷新与回退保持视图。 */
  const handleResultChange = (key: string) => {
    setResult(key as InspectionResultFilter | 'all')
    setPagination((prev) => ({ ...prev, current: 1 }))
    const next = new URLSearchParams(searchParams)
    if (key === 'all') next.delete('result')
    else next.set('result', key)
    setSearchParams(next, { replace: true })
  }

  const handleSearch = (next: InspectionFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  if (inspectId) {
    return (
      <InspectionFormView
        key={inspectId}
        id={inspectId}
        onCancel={() => setSearchParams({}, { replace: true })}
        onSubmitted={() => setSearchParams({ result: 'settled' }, { replace: true })}
      />
    )
  }
  if (detailId) {
    return (
      <InspectionDetailView
        id={detailId}
        onBack={() => setSearchParams({}, { replace: true })}
        onInspect={() => setSearchParams({ action: 'inspect', id: detailId }, { replace: true })}
      />
    )
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {routeMeta.receivingInspection.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {routeMeta.receivingInspection.description}
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
          message="验收单列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <InspectionFilterBar onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        <Tabs activeKey={result} onChange={handleResultChange} items={RESULT_TABS} />
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="验收单列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <InspectionTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onView={(record) => setSearchParams({ action: 'detail', id: record.id })}
            onInspect={(record) => setSearchParams({ action: 'inspect', id: record.id })}
          />
        )}
      </Card>
    </>
  )
}
