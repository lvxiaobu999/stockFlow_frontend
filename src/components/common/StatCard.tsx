import { Card, Statistic } from 'antd'
import type { StatisticProps } from 'antd'

type StatCardProps = StatisticProps & {
  title: string
}

/** 统计卡片：包裹 Ant Design Statistic，透传其余配置给统计组件。 */
export function StatCard({ title, ...statisticProps }: StatCardProps) {
  return (
    <Card>
      <Statistic title={title} {...statisticProps} />
    </Card>
  )
}
