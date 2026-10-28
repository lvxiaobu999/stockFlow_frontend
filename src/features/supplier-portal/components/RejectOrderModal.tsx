import { App, Alert, Form, Input, Modal } from 'antd'
import { usePortalMutations } from '../hooks/usePortalMutations'
import type { PurchaseOrderRecord } from '../types'

interface RejectOrderModalProps {
  /** 待拒绝的订单；null 表示弹窗关闭。 */
  order: PurchaseOrderRecord | null
  onClose: () => void
}

/**
 * 拒绝订单弹窗：原因必填（会展示给采购方），拒绝后订单进入已拒绝，
 * 由采购方决定重发（换交期 / 数量）或作废后重新生成订单。
 */
export function RejectOrderModal({ order, onClose }: RejectOrderModalProps) {
  const { message } = App.useApp()
  const { reject } = usePortalMutations()
  const [form] = Form.useForm<{ reason: string }>()

  const handleOk = async () => {
    if (!order) return
    const { reason } = await form.validateFields()
    reject.mutate(
      { id: order.id, payload: { reason: reason.trim() } },
      {
        onSuccess: (record) => {
          message.success(`采购订单 ${record.code} 已拒绝`)
          onClose()
        },
        onError: (mutationError) => message.error(mutationError.message),
      },
    )
  }

  return (
    <Modal
      title={order ? `拒绝采购订单 · ${order.code}` : '拒绝采购订单'}
      open={order !== null}
      okText="确认拒绝"
      okButtonProps={{ danger: true, loading: reject.isPending }}
      cancelText="取消"
      onCancel={onClose}
      onOk={() => void handleOk()}
      destroyOnHidden
    >
      <Alert className="mb-4" type="warning" showIcon message="拒绝后采购方将收到通知，可修改后重新发送或另选供应商" />
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          label="拒绝原因"
          name="reason"
          rules={[
            { required: true, whitespace: true, message: '请填写拒绝原因' },
            { max: 200, message: '原因不超过 200 个字符' },
          ]}
        >
          <Input.TextArea rows={3} placeholder="如：缺货、交期无法满足、价格需重新协商等" maxLength={200} showCount />
        </Form.Item>
      </Form>
    </Modal>
  )
}
