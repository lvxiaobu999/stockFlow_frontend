import { useState } from 'react'
import { Alert, App, Button, Card, Space, Spin } from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { routeMeta } from '@/config/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { LogFilterBar, type LogFilters } from '@/features/system/components/log/LogFilterBar'
import { LogTable } from '@/features/system/components/log/LogTable'
import { useLogFilterOptions, useOperationLogs } from '@/features/system/hooks/useOperationLogs'
import { downloadCsv, formatDateTime } from '@/utils'

/**
 * 操作日志页（只读）：筛选 + 审计表格 + 当前页 CSV 导出。
 *
 * 「导出 Excel」在 MVP 阶段用前端当前页 CSV 过渡（UTF-8 BOM 兼容 Excel），
 * 后续替换为后端导出接口后无需改动页面结构。
 */
export default function OperationLogPage() {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const canExport = has('system:log:export')

  const [filters, setFilters] = useState<LogFilters>({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  const { data, isLoading, isFetching, error, refetch } = useOperationLogs({ ...filters, ...pagination })
  const { data: options } = useLogFilterOptions()

  /** 导出当前页数据；字段口径与表格列保持一致。 */
  const handleExport = () => {
    if (!data?.lists.length) {
      message.warning('当前页没有可导出的数据')
      return
    }
    downloadCsv(
      `操作日志_${dayjs().format('YYYYMMDD-HHmmss')}.csv`,
      ['操作时间', '操作人', '模块', '动作', '对象', 'IP', '结果'],
      data.lists.map((log) => [
        formatDateTime(log.operatedAt),
        log.operator,
        log.moduleName,
        log.action,
        log.targetSummary,
        log.ip,
        log.success ? '成功' : '失败',
      ]),
    )
    message.success('已导出当前页数据（CSV，可直接用 Excel 打开）')
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title={routeMeta.systemOperationLog.title}
        description={routeMeta.systemOperationLog.description}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
              刷新
            </Button>
            {canExport ? (
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出 Excel
              </Button>
            ) : null}
          </Space>
        }
      />
      {error ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message="操作日志加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <LogFilterBar
        options={options}
        onSearch={(next) => {
          setFilters(next)
          setPagination((prev) => ({ ...prev, current: 1 }))
        }}
      />
      <Card size="small" className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="操作日志加载中">
            <Spin size="large" />
          </div>
        ) : (
          <LogTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
          />
        )}
      </Card>
    </div>
  )
}
