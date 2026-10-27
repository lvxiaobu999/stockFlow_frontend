import { useState } from 'react'
import { Alert, Button, Card, Space, Spin } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { routeMeta } from '@/config/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { ApprovalActionPanel } from '@/features/approval/components/ApprovalActionPanel'
import { ApprovalTaskTable } from '@/features/approval/components/ApprovalTaskTable'
import { useApprovalTasks } from '@/features/approval/hooks/useApprovals'
import type { ApprovalTask } from '@/features/approval/types'
import { PurchaseRequestDetailView } from '@/features/purchase/components/PurchaseRequestDetailView'
import {
  PurchaseRequestFilterBar,
  type PurchaseRequestFilters,
} from '@/features/purchase/components/PurchaseRequestFilterBar'

/** 页内视图态：待办列表 / 审批详情（详情注入裁决面板）。 */
type PendingApprovalView = { mode: 'list' } | { mode: 'detail'; id: string }

/**
 * 我的审批页面：待办列表（按提交时间升序，先到先审）与审批详情页内切换。
 * 待办池是全体审批人共享的（单级审批），列表筛选复用采购申请筛选栏
 * （关键字 / 申请人 / 提交时间范围，字段口径一致）。
 */
export default function PendingApprovalPage() {
  const [view, setView] = useState<PendingApprovalView>({ mode: 'list' })
  const [filters, setFilters] = useState<PurchaseRequestFilters>({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  const { data, isLoading, isFetching, error, refetch } = useApprovalTasks({
    ...filters,
    ...pagination,
  })

  // 筛选变化都回到第一页，避免停留在已不存在的页码上。
  const handleSearch = (next: PurchaseRequestFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  if (view.mode === 'detail') {
    return (
      <PurchaseRequestDetailView
        id={view.id}
        onBack={() => setView({ mode: 'list' })}
        actionPanel={<ApprovalActionPanel requestId={view.id} onDone={() => setView({ mode: 'list' })} />}
      />
    )
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title={routeMeta.approvalPending.title}
        description={routeMeta.approvalPending.description}
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
          message="待审批列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <PurchaseRequestFilterBar onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="待审批列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <ApprovalTaskTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onReview={(task: ApprovalTask) => setView({ mode: 'detail', id: task.id })}
          />
        )}
      </Card>
    </div>
  )
}
