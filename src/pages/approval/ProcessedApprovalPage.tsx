import { useState } from 'react'
import { Alert, Button, Card, Space, Spin } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { routeMeta } from '@/config/routes'
import { PageHeader } from '@/components/common/PageHeader'
import {
  ApprovalProcessedFilterBar,
  type ApprovalProcessedFilters,
} from '@/features/approval/components/ApprovalProcessedFilterBar'
import { ApprovalProcessedTable } from '@/features/approval/components/ApprovalProcessedTable'
import { useApprovalProcessedRecords } from '@/features/approval/hooks/useApprovals'
import type { ApprovalProcessedRecord } from '@/features/approval/types'
import { PurchaseRequestDetailView } from '@/features/purchase/components/PurchaseRequestDetailView'

/** 页内视图态：已办列表 / 只读详情。 */
type ProcessedApprovalView = { mode: 'list' } | { mode: 'detail'; id: string }

/**
 * 我已审批页面：当前登录用户出具过结论的单据列表与只读详情页内切换。
 * 结论已出不可再操作，详情以 readonly 模式复用采购申请详情视图。
 */
export default function ProcessedApprovalPage() {
  const [view, setView] = useState<ProcessedApprovalView>({ mode: 'list' })
  const [filters, setFilters] = useState<ApprovalProcessedFilters>({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  const { data, isLoading, isFetching, error, refetch } = useApprovalProcessedRecords({
    ...filters,
    ...pagination,
  })

  // 筛选变化都回到第一页，避免停留在已不存在的页码上。
  const handleSearch = (next: ApprovalProcessedFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  if (view.mode === 'detail') {
    return <PurchaseRequestDetailView id={view.id} onBack={() => setView({ mode: 'list' })} readonly />
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title={routeMeta.approvalProcessed.title}
        description={routeMeta.approvalProcessed.description}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
              刷新
            </Button>
          </Space>
        }
      />
      {error ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message="我已审批列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <ApprovalProcessedFilterBar onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="我已审批列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <ApprovalProcessedTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onView={(record: ApprovalProcessedRecord) => setView({ mode: 'detail', id: record.businessId })}
          />
        )}
      </Card>
    </div>
  )
}
