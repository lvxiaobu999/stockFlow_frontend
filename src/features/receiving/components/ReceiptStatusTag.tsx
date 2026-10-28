import { Tag } from 'antd'
import { RECEIPT_STATUS_META, type ReceiptStatus } from '../types'

/** 收货单状态标签：列表页签、状态列与详情头共用同一套颜色口径（待收货橙 / 已收货蓝）。 */
export function ReceiptStatusTag({ status }: { status: ReceiptStatus }) {
  const meta = RECEIPT_STATUS_META[status]
  return <Tag color={meta.color}>{meta.label}</Tag>
}
