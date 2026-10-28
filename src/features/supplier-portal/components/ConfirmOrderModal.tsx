import { App, Alert, DatePicker, Form, Modal } from 'antd'
import dayjs from 'dayjs'
import { usePortalMutations } from '../hooks/usePortalMutations'
import type { PurchaseOrderRecord } from '../types'

interface ConfirmOrderModalProps {
  /** 待确认的订单；null 表示弹窗关闭。 */
  order: PurchaseOrderRecord | null
  onClose: () => void
}

/**
 * 确认订单弹窗：可填预计发货时间（可选），确认后订单进入待发货。
 * 预计发货时间会回写订单并展示给采购方，便于双方对齐交期。
 */
export function ConfirmOrderModal({ order, onClose }: ConfirmOrderModalProps) {
  const { message } = App.useApp()
  const { confirm } = usePortalMutations()
  const [form] = Form.useForm<{ expectedShipDate?: dayjs.Dayjs }>()

  const handleOk = async () => {
    if (!order) return
    const { expectedShipDate } = await form.validateFields()
    confirm.mutate(
      { id: order.id, payload: { expectedShipDate: expectedShipDate?.format('YYYY-MM-DD') } },
      {
        onSuccess: (record) => {
          message.success(`采购订单 ${record.code} 已确认，请及时安排发货`)
          onClose()
        },
        onError: (mutationError) => message.error(mutationError.message),
      },
    )
  }

  return (
    <Modal
      title={order ? `确认采购订单 · ${order.code}` : '确认采购订单'}
      open={order !== null}
      okText="确认订单"
      okButtonProps={{ loading: confirm.isPending }}
      cancelText="取消"
      onCancel={onClose}
      onOk={() => void handleOk()}
      destroyOnHidden
    >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="确认后订单进入「待发货」，请按约定时间安排发货并填写物流信息"
      />
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item label="预计发货时间" name="expectedShipDate">
          <DatePicker
            className="w-full"
            placeholder="选择预计发货日期（可留空）"
            // 不能早于今天：已过去的日期没有承诺意义。
            disabledDate={(current) => current.isBefore(dayjs().startOf('day'))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
