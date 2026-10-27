import { App, Button, Card, Form, Input, Typography } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useApprovalMutations } from '@/features/approval/hooks/useApprovalMutations'
import { usePurchaseRequestDetail } from '@/features/purchase/hooks/usePurchaseRequests'

interface ApprovalActionPanelProps {
  requestId: string
  /** 裁决成功 / 单据已失效后的回跳（通常回到待办列表）。 */
  onDone: () => void
}

type DecisionAction = 'approve' | 'reject'

/**
 * 审批裁决面板：意见框 + 通过（绿）/ 拒绝（红）双按钮。
 *
 * - 通过意见选填、拒绝意见必填（前端拦截 + 服务端 4001 兜底）；
 * - 面板自带详情查询做状态守卫：单据已非待审批（先到先审被他人在
 *   别处处理、或申请人已撤回）时降级为失效提示，不出现裁决按钮。
 */
export function ApprovalActionPanel({ requestId, onDone }: ApprovalActionPanelProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<{ comment?: string }>()
  const [resolving, setResolving] = useState<DecisionAction | null>(null)
  const { data } = usePurchaseRequestDetail(requestId)
  const { approve, reject } = useApprovalMutations()

  // 详情未加载完前先按可处理渲染，避免面板闪烁；提交时以服务端校验兜底。
  const resolved = data !== null && data.status !== 'pending'
  if (resolved) {
    return (
      <Card size="small" title="审批操作">
        <Typography.Text type="secondary">
          该申请已被处理（
          {data?.status === 'approved' ? '已通过' : data?.status === 'rejected' ? '已拒绝' : '状态已变更'}），
          审批以先到先审为准，请返回列表查看最新状态。
        </Typography.Text>
        <div className="mt-3">
          <Button onClick={onDone}>返回列表</Button>
        </div>
      </Card>
    )
  }

  const submitDecision = (action: DecisionAction) => {
    const comment = (form.getFieldValue('comment') as string | undefined)?.trim()
    // 拒绝必填意见：先在表单上给出内联错误，服务端 4001 兜底。
    if (action === 'reject' && !comment) {
      form.setFields([{ name: 'comment', errors: ['拒绝时必须填写审批意见'] }])
      return
    }
    setResolving(action)
    const mutation = action === 'approve' ? approve : reject
    mutation.mutate(
      { id: requestId, payload: { comment: comment || undefined } },
      {
        onSuccess: (record) => {
          message.success(`采购申请 ${record.code} 已${action === 'approve' ? '通过' : '拒绝'}`)
          onDone()
        },
        onError: (mutationError) => {
          setResolving(null)
          message.error(mutationError.message)
        },
      },
    )
  }

  return (
    <Card
      size="small"
      title="审批操作"
      extra={<Typography.Text type="secondary">通过可不填意见，拒绝必须说明原因</Typography.Text>}
    >
      <Form form={form} layout="vertical" disabled={resolving !== null}>
        <Form.Item name="comment" label="审批意见" style={{ marginBottom: 12 }}>
          <Input.TextArea rows={3} maxLength={200} showCount placeholder="填写审批意见（拒绝时必填，将展示给申请人）" />
        </Form.Item>
        <div className="flex gap-3">
          <Button
            color="green"
            variant="solid"
            icon={<CheckOutlined />}
            loading={resolving === 'approve'}
            disabled={resolving === 'reject'}
            onClick={() => submitDecision('approve')}
          >
            通过
          </Button>
          <Button
            color="red"
            variant="solid"
            icon={<CloseOutlined />}
            loading={resolving === 'reject'}
            disabled={resolving === 'approve'}
            onClick={() => submitDecision('reject')}
          >
            拒绝
          </Button>
        </div>
      </Form>
    </Card>
  )
}
