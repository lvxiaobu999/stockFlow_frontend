import { useState } from 'react'
import { Alert, App, Button, Card, Descriptions, Form, Input, InputNumber, Radio, Select, Spin, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { ReconciliationStatusTag } from './ReconciliationStatusTag'
import { useReconciliationDetail, useReconciliationMutations } from '../hooks'
import { RECONCILIATION_DIFF_TYPE_META, type ReconciliationDiffType } from '../types'
import { formatMoney } from '@/utils'

interface ReconciliationConfirmViewProps {
  id: string
  onCancel: () => void
  /** 确认通过 / 标记差异成功后回调（父级返回列表）。 */
  onDone: () => void
}

interface ConfirmFormValues {
  action: 'pass' | 'diff'
  opinion?: string
  diffType?: ReconciliationDiffType
  diffAmount?: number
  reason?: string
}

const DIFF_TYPE_OPTIONS = (Object.keys(RECONCILIATION_DIFF_TYPE_META) as ReconciliationDiffType[]).map((type) => ({
  value: type,
  label: RECONCILIATION_DIFF_TYPE_META[type],
}))

/**
 * 对账确认 / 差异处理视图（财务核对工作台）：
 * - 确认无误 → 确认通过（可附确认意见），对账单进入已确认；
 * - 标记有差异 → 填写差异类型 / 金额 / 说明，「仅标记差异」进入有差异；
 *   差异核对完成后仍可在本页直接「确认通过」（视为处理完毕，服务端清除差异标记）。
 */
export function ReconciliationConfirmView({ id, onCancel, onDone }: ReconciliationConfirmViewProps) {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const canConfirm = has('reconciliation:list:confirm')
  const { data, isLoading, error } = useReconciliationDetail(id)
  const { confirmReconciliation, markDiffReconciliation } = useReconciliationMutations()
  const [form] = Form.useForm<ConfirmFormValues>()
  // 动作取向：确认通过 / 标记差异。有差异单默认落在差异处理；
  // 默认值依赖详情数据（加载后才可知），故用「显式选择优先」的派生口径，
  // 避免 useState 初始值在数据到达前定型导致默认页签错误。
  const [actionOverride, setActionOverride] = useState<'pass' | 'diff' | null>(null)
  const action = actionOverride ?? (data?.status === 'disputed' ? 'diff' : 'pass')

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="对账确认加载中">
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
          message="对账单加载失败"
          description={error?.message ?? '对账单不存在'}
          action={<Button onClick={onCancel}>返回列表</Button>}
        />
      </div>
    )
  }
  // 状态兜底：仅待确认 / 有差异单可进入确认视图。
  if (data.status !== 'pending' && data.status !== 'disputed') {
    return (
      <div className="dashboard-page">
        <Alert
          type="warning"
          showIcon
          message="当前对账单无需确认"
          description="仅待确认或有差异的对账单可执行确认 / 标记差异操作。"
          action={<Button onClick={onCancel}>返回列表</Button>}
        />
      </div>
    )
  }

  /** 确认通过：pending / disputed → confirmed，意见选填（追溯用）。 */
  const handleConfirmPass = () => {
    confirmReconciliation.mutate(
      { id: data.id, opinion: form.getFieldValue('opinion')?.trim() || undefined },
      {
        onSuccess: (record) => {
          message.success(`对账单 ${record.code} 已确认通过`)
          onDone()
        },
        onError: (mutationError) => message.error(mutationError.message),
      },
    )
  }

  /** 仅标记差异：pending / disputed → disputed（可重复标记更新差异信息）。 */
  const handleMarkDiff = () => {
    form.validateFields(['diffType', 'reason']).then((values) => {
      markDiffReconciliation.mutate(
        {
          id: data.id,
          diffType: values.diffType!,
          diffAmount: values.diffAmount,
          reason: values.reason!.trim(),
        },
        {
          onSuccess: (record) => {
            message.success(`对账单 ${record.code} 已标记差异，待与供应商核对`)
            onDone()
          },
          onError: (mutationError) => message.error(mutationError.message),
        },
      )
    })
  }

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {data.status === 'disputed' ? '差异处理' : '对账确认'}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {`${data.code} · ${data.supplierName} · 应付 ¥${formatMoney(data.payableAmount)}（待付 ¥${formatMoney(data.unpaidAmount)}）`}
          </Typography.Text>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={onCancel}>
          返回
        </Button>
      </div>

      <Card size="small" className="mt-4">
        <Descriptions column={4} size="small">
          <Descriptions.Item label="状态">
            <ReconciliationStatusTag status={data.status} />
          </Descriptions.Item>
          <Descriptions.Item label="对账期间">{`${data.periodStart} ~ ${data.periodEnd}`}</Descriptions.Item>
          <Descriptions.Item label="明细数">{data.items.length} 行</Descriptions.Item>
          <Descriptions.Item label="创建人">{data.createdByName}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" className="mt-4">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            action: data.status === 'disputed' ? 'diff' : 'pass',
            diffType: data.diffType,
            diffAmount: data.diffAmount,
            reason: data.diffReason,
          }}
          onValuesChange={(changed) => {
            if (changed.action) setActionOverride(changed.action)
          }}
        >
          <Form.Item name="action" label="核对结论">
            <Radio.Group disabled={!canConfirm}>
              <Radio value="pass">确认无误，账实相符</Radio>
              <Radio value="diff">标记有差异，需要与供应商核对</Radio>
            </Radio.Group>
          </Form.Item>

          {action === 'diff' ? (
            <>
              <Form.Item name="diffType" label="差异类型" rules={[{ required: true, message: '请选择差异类型' }]}>
                <Select
                  options={DIFF_TYPE_OPTIONS}
                  placeholder="请选择差异类型"
                  style={{ width: 220 }}
                  disabled={!canConfirm}
                />
              </Form.Item>
              <Form.Item
                name="diffAmount"
                label="差异金额（元，选填）"
                rules={[{ type: 'number', min: 0, message: '差异金额须为不小于 0 的数字' }]}
              >
                <InputNumber min={0} precision={2} placeholder="0.00" style={{ width: 220 }} disabled={!canConfirm} />
              </Form.Item>
              <Form.Item name="reason" label="差异说明" rules={[{ required: true, message: '请填写差异说明' }]}>
                <Input.TextArea
                  rows={3}
                  placeholder="差异原因与处理方式（必填，确认对账前需与供应商核对清楚）"
                  maxLength={200}
                  showCount
                  disabled={!canConfirm}
                />
              </Form.Item>
            </>
          ) : (
            <Form.Item name="opinion" label="确认意见（选填）">
              <Input.TextArea
                rows={3}
                placeholder="核对结论备注，记录进对账单追溯"
                maxLength={200}
                showCount
                disabled={!canConfirm}
              />
            </Form.Item>
          )}
        </Form>

        {!canConfirm ? (
          <Alert className="mt-2" type="info" showIcon message="你没有「确认 / 标记差异」权限，仅可查看本次核对内容" />
        ) : null}

        <div className="mt-4 flex justify-end gap-3">
          <Button onClick={onCancel}>返回</Button>
          {action === 'diff' ? (
            <Button loading={markDiffReconciliation.isPending} disabled={!canConfirm} onClick={handleMarkDiff}>
              仅标记差异
            </Button>
          ) : null}
          <Button
            type="primary"
            loading={confirmReconciliation.isPending}
            disabled={!canConfirm}
            onClick={handleConfirmPass}
          >
            确认通过
          </Button>
        </div>
      </Card>
    </div>
  )
}
