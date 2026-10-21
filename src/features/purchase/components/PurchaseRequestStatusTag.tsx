import { Tag } from 'antd'
import { PURCHASE_REQUEST_STATUS_META, type PurchaseRequestStatus } from '@/features/purchase/types'

/** 采购申请状态标签：列表页签、状态列与详情头共用同一套颜色口径。 */
export function PurchaseRequestStatusTag({ status }: { status: PurchaseRequestStatus }) {
  const meta = PURCHASE_REQUEST_STATUS_META[status]
  return <Tag color={meta.color}>{meta.label}</Tag>
}
