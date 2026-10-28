import type { PurchaseOrderRecord, PurchaseOrderStatus } from '@/features/purchase/types'
import { calcTotalAmount } from '@/features/purchase/utils/purchaseRequest'

/** 仅草稿可编辑（发出后单据内容对供应商生效，不可再改）。 */
export function isOrderEditable(status: PurchaseOrderStatus): boolean {
  return status === 'draft'
}

/**
 * 订单明细合计（元）= Σ 行金额。复用申请侧 Σ（quantity × 参考价）的求和口径，
 * 仅把订单明细的 unitPrice 适配为入参字段，保证两侧总额计算顺序一致。
 */
export function calcOrderTotalAmount(items: ReadonlyArray<{ quantity: number; unitPrice: number }>): number {
  return calcTotalAmount(items.map((item) => ({ quantity: item.quantity, referencePrice: item.unitPrice })))
}

/**
 * 可「发送供应商」的状态：草稿首发、已拒绝重发。
 * 重新发送不强制先改供应商（采购员可原单重发，也可作废后从申请重新生成）。
 */
export function canSendOrder(status: PurchaseOrderStatus): boolean {
  return status === 'draft' || status === 'rejected'
}

/** 可「作废」的状态：待供应商确认（误发召回）与已拒绝；草稿走删除，其余状态不可逆。 */
export function canVoidOrder(status: PurchaseOrderStatus): boolean {
  return status === 'pending_supplier' || status === 'rejected'
}

/** 仅草稿可物理删除；其余状态留痕（作废代替删除）。 */
export function canDeleteOrder(status: PurchaseOrderStatus): boolean {
  return status === 'draft'
}

/** 状态时间线节点（详情页右栏渲染用）：时间为空表示该节点尚未到达。 */
export interface OrderTimelineNode {
  /** 节点唯一标识（antd Timeline 的 key）。 */
  key: string
  /** 节点展示名（与状态字典口径一致）。 */
  label: string
  /** 到达时间（YYYY-MM-DD HH:mm:ss），未到达为空。 */
  time?: string
  /** 附注（拒绝 / 作废原因）。 */
  note?: string
  /** antd Timeline 节点色：绿色已到达、灰色未到达、红色异常终态。 */
  color: 'green' | 'gray' | 'red'
}

/**
 * 由单据上的状态时间戳派生状态时间线（服务端不单独维护流水表）。
 *
 * 主链按状态机正序展开：创建 → 发送 → 确认 → 发货 → 收货 → 验收 → 完成；
 * rejected 与 cancelled 是 pending_supplier 之后的分支终态——拒绝节点插在
 * 确认之后（时间线上主链后续节点必然未到达），作废节点单独追加在末尾。
 */
export function buildOrderTimeline(record: PurchaseOrderRecord): OrderTimelineNode[] {
  const nodes: OrderTimelineNode[] = [
    { key: 'create', label: '创建订单', time: record.createdAt, color: 'green' },
    { key: 'send', label: '发送供应商', time: record.sentAt, color: record.sentAt ? 'green' : 'gray' },
  ]
  if (record.status === 'rejected') {
    nodes.push({
      key: 'rejected',
      label: '供应商拒绝',
      time: record.rejectedAt,
      note: record.rejectReason,
      color: 'red',
    })
    return nodes
  }
  nodes.push(
    { key: 'confirm', label: '供应商确认', time: record.confirmedAt, color: record.confirmedAt ? 'green' : 'gray' },
    { key: 'ship', label: '供应商发货', time: record.shippedAt, color: record.shippedAt ? 'green' : 'gray' },
    { key: 'receive', label: '仓库收货', time: record.receivedAt, color: record.receivedAt ? 'green' : 'gray' },
    { key: 'inspect', label: '验收完成', time: record.inspectedAt, color: record.inspectedAt ? 'green' : 'gray' },
    { key: 'complete', label: '付款结清', time: record.completedAt, color: record.completedAt ? 'green' : 'gray' },
  )
  if (record.status === 'cancelled') {
    nodes.push({
      key: 'cancelled',
      label: '订单作废',
      time: record.cancelledAt,
      note: record.cancelReason,
      color: 'red',
    })
  }
  return nodes
}
