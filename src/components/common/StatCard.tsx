import { Card, Statistic } from 'antd'
import type { StatisticProps } from 'antd'

type StatCardProps = StatisticProps & {
  title: string
}

export function StatCard({ title, ...statisticProps }: StatCardProps) {
  return (
    <Card>
      <Statistic title={title} {...statisticProps} />
    </Card>
  )
}
