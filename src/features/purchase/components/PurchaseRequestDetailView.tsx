import { Alert, App, Button, Card, Descriptions, Popconfirm, Space, Spin, Table, Tag, Timeline, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { PurchaseRequestStatusTag } from '@/features/purchase/components/PurchaseRequestStatusTag'
import { usePurchaseRequestDetail } from '@/features/purchase/hooks/usePurchaseRequests'
import { usePurchaseRequestMutations } from '@/features/purchase/hooks/usePurchaseRequestMutations'
import { APPROVAL_ACTION_NAMES, type ApprovalRecord } from '@/features/approval/types'
import type { PurchaseRequestItem } from '@/features/purchase/types'
import { calcTotalAmount } from '@/features/purchase/utils/purchaseRequest'
import { formatDateTime, formatMoney } from '@/utils'

interface PurchaseRequestDetailViewProps {
  id: string
  onBack: () => void
  /** 进入编辑（草稿编辑 / 被拒重提）。 */
  onEdit: () => void
}

/** 审批时间线节点配色：结论醒目、过程动作中性。 */
const ACTION_TIMELINE_COLOR: Record<ApprovalRecord['action'], string> = {
  create: 'gray',
  submit: 'blue',
  resubmit: 'blue',
  withdraw: 'gray',
  approve: 'green',
  reject: 'red',
}

/**
 * 采购申请详情视图：概要卡片 + 申请明细 / 申请信息 + 审批记录时间线。
 *
 * 头部按状态给出主操作（草稿编辑/提交/删除、待审批撤回、已通过生成订单、
 * 已生成订单查看订单）；审批流水由详情接口随单返回（时间正序）。
 */
export function PurchaseRequestDetailView({ id, onBack, onEdit }: PurchaseRequestDetailViewProps) {
  const { message } = App.useApp()
  const { data, isLoading, error } = usePurchaseRequestDetail(id)
  const { remove, submit, withdraw } = usePurchaseRequestMutations()
  const { has } = usePermissions()
  const canEdit = has('purchase:request:update')
  const canSubmit = has('purchase:request:submit')
  const canWithdraw = has('purchase:request:withdraw')
  const canDelete = has('purchase:request:delete')

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="采购申请详情加载中">
          <Spin size="large" />
        </div>
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="dashboard-page">
        <Alert
          type="error"
          showIcon
          message="采购申请详情加载失败"
          description={error?.message ?? '申请不存在或已被移除'}
          action={<Button onClick={onBack}>返回列表</Button>}
        />
      </div>
    )
  }

  const statusCta = (() => {
    switch (data.status) {
      case 'draft':
        return (
          <Space>
            {canEdit ? (
              <Button type="primary" onClick={onEdit}>
                编辑
              </Button>
            ) : null}
            {canSubmit ? (
              <Button
                type="primary"
                ghost
                loading={submit.isPending}
                onClick={() =>
                  submit.mutate(data.id, {
                    onSuccess: (record) => message.success(`采购申请 ${record.code} 已提交审批`),
                    onError: (mutationError) => message.error(mutationError.message),
                  })
                }
              >
                提交审批
              </Button>
            ) : null}
            {canDelete ? (
              <Popconfirm
                title="删除采购申请"
                description="草稿删除后不可恢复，确认删除？"
                okText="删除"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                onConfirm={() =>
                  remove.mutate(data.id, {
                    onSuccess: () => {
                      message.success(`采购申请 ${data.code} 已删除`)
                      onBack()
                    },
                    onError: (mutationError) => message.error(mutationError.message),
                  })
                }
              >
                <Button danger loading={remove.isPending}>
                  删除
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        )
      case 'pending':
        return canWithdraw ? (
          <Popconfirm
            title="撤回采购申请"
            description="撤回后申请回到草稿态，可修改后重新提交。确认撤回？"
            okText="撤回"
            cancelText="取消"
            onConfirm={() =>
              withdraw.mutate(data.id, {
                onSuccess: (record) => message.success(`采购申请 ${record.code} 已撤回`),
                onError: (mutationError) => message.error(mutationError.message),
              })
            }
          >
            <Button loading={withdraw.isPending}>撤回</Button>
          </Popconfirm>
        ) : null
      case 'rejected':
        return canEdit ? (
          <Button type="primary" onClick={onEdit}>
            修改重提
          </Button>
        ) : null
      default:
        // 生成订单 / 查看订单属采购订单模块，该模块上线前仅提示占位。
        return null
    }
  })()

  const itemColumns: ColumnsType<PurchaseRequestItem> = [
    {
      title: '商品',
      render: (_, item) => (
        <div className="min-w-0">
          <Typography.Text className="block truncate">{item.productName}</Typography.Text>
          <Typography.Text type="secondary" className="block truncate text-xs">
            {item.productCode} · {item.spec}
          </Typography.Text>
        </div>
      ),
    },
    { title: '单位', dataIndex: 'unit', width: 70 },
    { title: '数量', dataIndex: 'quantity', width: 90, align: 'right' },
    {
      title: '参考单价',
      dataIndex: 'referencePrice',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 160,
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
  ]

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <Space size={8}>
            <Typography.Title level={2} className="mb-0!">
              采购申请详情
            </Typography.Title>
            <PurchaseRequestStatusTag status={data.status} />
          </Space>
          <Typography.Text type="secondary" className="block">
            {`${data.code} · 申请人 ${data.applicantName} · 预计金额 ¥${formatMoney(data.totalAmount)}`}
          </Typography.Text>
        </div>
        <Space>
          {statusCta}
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
          </Button>
        </Space>
      </div>

      <Card size="small" className="mt-4">
        <Descriptions column={4} size="small">
          <Descriptions.Item label="申请主题" span={2}>
            {data.title}
          </Descriptions.Item>
          <Descriptions.Item label="期望到货">{data.expectedDate ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="提交时间">
            {data.submittedAt ? formatDateTime(data.submittedAt) : '未提交（草稿）'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <div className="mt-4 flex items-stretch gap-4">
        <div className="min-w-0 flex-1">
          <Card size="small" title="申请明细">
            <Table<PurchaseRequestItem>
              rowKey="id"
              columns={itemColumns}
              dataSource={data.items}
              pagination={false}
              scroll={{ x: 760 }}
              summary={(rows) => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <Typography.Text strong>合计（{rows.length} 项）</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Typography.Text strong>¥{formatMoney(calcTotalAmount(rows))}</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    <span> </span>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
            <Descriptions column={1} size="small" className="mt-4">
              <Descriptions.Item label="采购原因">{data.reason}</Descriptions.Item>
              {data.orderedOrderCode ? (
                <Descriptions.Item label="关联订单">
                  <Tag color="processing">{data.orderedOrderCode}</Tag>
                </Descriptions.Item>
              ) : null}
            </Descriptions>
          </Card>
        </div>
        <div className="w-96 shrink-0">
          <Card size="small" title="审批记录" className="h-full">
            {data.approvalRecords.length === 0 ? (
              <Typography.Text type="secondary">暂无审批记录</Typography.Text>
            ) : (
              <Timeline
                items={data.approvalRecords.map((record) => ({
                  color: ACTION_TIMELINE_COLOR[record.action],
                  // antd v6 用 content 承载节点内容（children 已废弃）。
                  content: (
                    <div>
                      <Typography.Text type="secondary" className="block text-xs">
                        {formatDateTime(record.createdAt)}
                      </Typography.Text>
                      <Typography.Text strong className="block">
                        {`${APPROVAL_ACTION_NAMES[record.action]} · ${record.operatorName}`}
                        {record.department ? `（${record.department}）` : ''}
                      </Typography.Text>
                      {record.comment ? (
                        <Typography.Paragraph
                          type="secondary"
                          className="mt-1 mb-0 rounded bg-slate-50 px-3 py-2 text-xs"
                        >
                          {record.comment}
                        </Typography.Paragraph>
                      ) : null}
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
