import { Alert, Button, Card, Col, Row, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FileAddOutlined, ProfileOutlined, RadarChartOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { routeMeta } from '@/config/routes'
import { ReconciliationSummaryCards } from '@/features/reconciliation/components/ReconciliationSummaryCards'
import { ReconciliationStatusTag } from '@/features/reconciliation/components/ReconciliationStatusTag'
import { useReconciliationSummary } from '@/features/reconciliation/hooks'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import type { ReconciliationRecord } from '@/features/reconciliation/types'
import { formatMoney, formatShortDateTime } from '@/utils'

/**
 * 对账汇总看板：待对账 / 本月已对账 / 待确认 / 有差异四卡 + 快捷入口 +
 * 近期待处理列表（待确认与有差异对账单，可直接进入确认或详情）。
 */
export default function ReconciliationOverviewPage() {
  const navigate = useNavigate()
  const { has } = usePermissions()
  const canConfirm = has('reconciliation:list:confirm')
  const { data: summary, isLoading, error, refetch } = useReconciliationSummary()

  const quickLinks = [
    {
      key: 'create',
      icon: <FileAddOutlined />,
      title: '发起对账',
      description: '从待对账单据池选择单据发起新对账',
      path: `${routeMeta.reconciliationList.path}?action=create`,
      disabled: !has('reconciliation:list:create'),
    },
    {
      key: 'list',
      icon: <ProfileOutlined />,
      title: '对账列表',
      description: '查看全部对账单与处理进度',
      path: routeMeta.reconciliationList.path,
      disabled: false,
    },
    {
      key: 'pool',
      icon: <RadarChartOutlined />,
      title: '待对账单据池',
      description: '已收货待纳入对账的单据一览',
      path: routeMeta.reconciliationPendingPool.path,
      disabled: false,
    },
  ]

  const columns: ColumnsType<ReconciliationRecord> = [
    {
      title: '对账单号',
      dataIndex: 'code',
      width: 165,
      render: (code: string) => <Typography.Text copyable={{ text: code }}>{code}</Typography.Text>,
    },
    { title: '供应商', dataIndex: 'supplierName', width: 160, ellipsis: true },
    {
      title: '对账期间',
      key: 'period',
      width: 190,
      render: (_, record) => `${record.periodStart} ~ ${record.periodEnd}`,
    },
    {
      title: '应付金额',
      dataIndex: 'payableAmount',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '待付金额',
      dataIndex: 'unpaidAmount',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: ReconciliationRecord['status']) => <ReconciliationStatusTag status={status} />,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 130,
      render: (value: string) => formatShortDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 140,
      render: (_, record) => (
        <Space size={0} split={<Typography.Text type="secondary">|</Typography.Text>}>
          {record.status === 'pending' || record.status === 'disputed' ? (
            <Button
              type="link"
              size="small"
              disabled={!canConfirm}
              onClick={() => navigate(`${routeMeta.reconciliationList.path}?action=confirm&id=${record.id}`)}
            >
              去确认
            </Button>
          ) : null}
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`${routeMeta.reconciliationList.path}?action=detail&id=${record.id}`)}
          >
            查看
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {routeMeta.reconciliationOverview.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {routeMeta.reconciliationOverview.description}
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
          刷新
        </Button>
      </div>
      {error ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message="对账汇总加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}

      <ReconciliationSummaryCards data={summary} loading={isLoading} />

      <Row gutter={[16, 16]} className="mt-4">
        {quickLinks.map((link) => (
          <Col key={link.key} xs={24} md={8}>
            <Card
              size="small"
              hoverable={!link.disabled}
              className={link.disabled ? 'h-full opacity-60' : 'h-full cursor-pointer'}
              onClick={() => {
                if (!link.disabled) navigate(link.path)
              }}
              aria-disabled={link.disabled}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl text-[#1677ff]">{link.icon}</span>
                <div className="min-w-0">
                  <Typography.Text strong className="block">
                    {link.title}
                  </Typography.Text>
                  <Typography.Text type="secondary" className="block truncate text-xs">
                    {link.description}
                  </Typography.Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        size="small"
        className="mt-4"
        title="近期待处理（待确认 / 有差异）"
        extra={
          <Button type="link" size="small" onClick={() => navigate(routeMeta.reconciliationList.path)}>
            查看全部
          </Button>
        }
      >
        <Table<ReconciliationRecord>
          rowKey="id"
          columns={columns}
          dataSource={summary?.recentList ?? []}
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1050 }}
          locale={{ emptyText: '暂无待处理对账单，全部对账均已确认' }}
        />
      </Card>
    </>
  )
}
