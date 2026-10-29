import { Card, Col, Row, Skeleton, Statistic, Typography } from 'antd'
import { formatMoney } from '@/utils'
import type { ReconciliationSummary } from '../types'

interface ReconciliationSummaryCardsProps {
  data: ReconciliationSummary | null
  loading: boolean
}

/**
 * 对账汇总四卡：待对账金额（单据池合计）/ 本月已对账金额 /
 * 待确认笔数 / 有差异笔数。金额卡用元两位小数，笔数卡为整数。
 */
export function ReconciliationSummaryCards({ data, loading }: ReconciliationSummaryCardsProps) {
  if (loading) {
    return (
      <Row gutter={[16, 16]}>
        {[0, 1, 2, 3].map((key) => (
          <Col key={key} xs={12} lg={6}>
            <Card size="small">
              <Skeleton active paragraph={{ rows: 1 }} title={{ width: '40%' }} />
            </Card>
          </Col>
        ))}
      </Row>
    )
  }

  const cards = [
    {
      key: 'pool',
      title: '待对账金额',
      value: data ? `¥${formatMoney(data.poolAmount)}` : '¥0.00',
      hint: data ? `${data.poolCount} 张单据待纳入对账` : '—',
    },
    {
      key: 'monthConfirmed',
      title: '本月已对账金额',
      value: data ? `¥${formatMoney(data.monthConfirmedAmount)}` : '¥0.00',
      hint: data ? `本月确认 ${data.monthConfirmedCount} 笔` : '—',
    },
    {
      key: 'pending',
      title: '待确认笔数',
      value: data?.pendingConfirmCount ?? 0,
      hint: '提交后等待财务核对的对账单',
    },
    {
      key: 'disputed',
      title: '有差异笔数',
      value: data?.disputedCount ?? 0,
      hint: '标记差异待处理的对账单',
    },
  ]

  return (
    <Row gutter={[16, 16]}>
      {cards.map((card) => (
        <Col key={card.key} xs={12} lg={6}>
          <Card size="small" aria-label={card.title}>
            <Statistic title={card.title} value={card.value} />
            <Typography.Text type="secondary" className="mt-1 block text-xs">
              {card.hint}
            </Typography.Text>
          </Card>
        </Col>
      ))}
    </Row>
  )
}
