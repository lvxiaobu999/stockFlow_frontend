import { Tag } from 'antd'
import { PURCHASE_ORDER_STATUS_META, type PurchaseOrderStatus } from '@/features/purchase/types'

/** 采购订单状态标签：列表页签、状态列与详情头共用同一套颜色口径。 */
export function PurchaseOrderStatusTag({ status }: { status: PurchaseOrderStatus }) {
  const meta = PURCHASE_ORDER_STATUS_META[status]
  return <Tag color={meta.color}>{meta.label}</Tag>
}
