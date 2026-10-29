import { Tag } from 'antd'
import { RECONCILIATION_STATUS_META, type ReconciliationStatus } from '../types'

/** 对账单状态标签：草稿蓝 / 待确认橙 / 已确认绿 / 有差异红 / 已关闭灰。 */
export function ReconciliationStatusTag({ status }: { status: ReconciliationStatus }) {
  const meta = RECONCILIATION_STATUS_META[status]
  return <Tag color={meta.color}>{meta.label}</Tag>
}
