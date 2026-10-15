import { Tag } from 'antd'
import type { EnableStatus } from '@/features/system/types'

/** 状态 → 标签样式映射：停用用灰色（default），与「失败」的红色语义区分开。 */
const STATUS_META: Record<EnableStatus, { label: string; color: string }> = {
  1: { label: '启用', color: 'green' },
  0: { label: '停用', color: 'default' },
}

/** 启用状态标签：用户、角色等列表共用同一套口径。 */
export function StatusTag({ status }: { status: EnableStatus }) {
  const meta = STATUS_META[status]
  return <Tag color={meta.color}>{meta.label}</Tag>
}
