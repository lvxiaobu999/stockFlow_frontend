import { Alert, Card, Col, Empty, Progress, Row, Spin, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { PageHeader, FreshnessTag } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { InventoryAlertTable } from '@/features/dashboard/components/InventoryAlertTable'
import { useDashboardSummary } from '@/features/dashboard/hooks/useDashboardSummary'
import { clamp } from '@/utils'

/** 工作台页面：组合汇总统计、库存预警与销售目标三个区域。 */
export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardSummary()

  // 加载中先渲染占位，避免统计卡片出现空值闪烁。
  if (isLoading) {
    return (
      <div className="route-fallback" role="status" aria-label="工作台加载中">
        <Spin size="large" />
      </div>
    )
  }

  // 请求失败或暂无数据时给出可读的错误提示。
  if (error || !data) {
    return <Alert type="error" showIcon message="工作台加载失败" description={error?.message ?? '请稍后重试'} />
  }

  // 目标完成度，clamp 到 0~100，防止超额完成时进度条超出上限。
  const progress = clamp(Math.round((data.monthlySales / data.salesTarget) * 100), 0, 100)

  return (
    <div className="dashboard-page">
      <PageHeader
        title="工作台"
        description="欢迎回来，管理员。这里是今天的经营概览。"
        extra={<FreshnessTag value={data.updatedAt} />}
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="商品总数" value={data.productCount} suffix="件" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="库存总值" value={data.inventoryValue} precision={1} prefix="¥" suffix="万" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="本月销售额"
            value={data.monthlySales}
            precision={1}
            prefix="¥"
            suffix="万"
            valueStyle={{ color: '#1677ff' }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="待处理订单" value={data.pendingOrders} suffix="单" valueStyle={{ color: '#fa8c16' }} />
        </Col>
      </Row>
      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} lg={16}>
          <Card title="库存预警" extra={<Link to="/inventory/stock-alert">查看全部</Link>}>
            {data.inventoryAlerts.length ? (
              <InventoryAlertTable data={data.inventoryAlerts} />
            ) : (
              <Empty description="暂无库存预警" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="本月销售目标">
            <div className="target-summary">
              <Typography.Title level={2}>¥{data.monthlySales}万</Typography.Title>
              <Typography.Text type="secondary">目标 ¥{data.salesTarget}万</Typography.Text>
            </div>
            <Progress percent={progress} strokeColor="#1677ff" />
            <Typography.Text type="secondary">较上月增长 18.6%</Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
