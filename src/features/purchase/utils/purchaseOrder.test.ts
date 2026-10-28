import { describe, expect, it } from 'vitest'
import type { PurchaseOrderRecord } from '../types'
import { buildOrderTimeline, canDeleteOrder, canSendOrder, canVoidOrder, isOrderEditable } from './purchaseOrder'

/** 构建最小可用订单（仅含时间线相关字段），按需覆盖状态与时间戳。 */
function buildOrder(overrides: Partial<PurchaseOrderRecord>): PurchaseOrderRecord {
  return {
    id: 'po-001',
    code: 'PO202609060001',
    supplierId: 'sup-001',
    supplierName: '杭州宏远纸业',
    purchaserId: 'u-001',
    purchaserName: '张伟',
    totalAmount: 100,
    status: 'draft',
    items: [],
    createdAt: '2026-09-06 11:00:00',
    updatedAt: '2026-09-06 11:00:00',
    ...overrides,
  }
}

/** 动作矩阵与时间线派生的纯工具：口径必须与状态机和后端动作约束一致。 */
describe('采购订单纯工具', () => {
  it('仅草稿可编辑、可删除', () => {
    const statuses = [
      'draft',
      'pending_supplier',
      'confirmed',
      'shipped',
      'received',
      'inspected',
      'completed',
      'rejected',
      'cancelled',
    ] as const
    for (const status of statuses) {
      expect(isOrderEditable(status)).toBe(status === 'draft')
      expect(canDeleteOrder(status)).toBe(status === 'draft')
    }
  })

  it('草稿首发、已拒绝重发；作废仅限待确认与已拒绝', () => {
    expect(canSendOrder('draft')).toBe(true)
    expect(canSendOrder('rejected')).toBe(true)
    expect(canSendOrder('pending_supplier')).toBe(false)
    expect(canSendOrder('confirmed')).toBe(false)
    expect(canVoidOrder('pending_supplier')).toBe(true)
    expect(canVoidOrder('rejected')).toBe(true)
    expect(canVoidOrder('draft')).toBe(false)
    expect(canVoidOrder('completed')).toBe(false)
  })

  it('时间线按主链正序展开，未到达节点为灰色', () => {
    const nodes = buildOrderTimeline(
      buildOrder({
        status: 'shipped',
        sentAt: '2026-09-06 13:00:00',
        confirmedAt: '2026-09-07 09:00:00',
        shippedAt: '2026-09-08 10:00:00',
      }),
    )
    expect(nodes.map((node) => node.key)).toEqual([
      'create',
      'send',
      'confirm',
      'ship',
      'receive',
      'inspect',
      'complete',
    ])
    expect(nodes.filter((node) => node.color === 'green').map((node) => node.key)).toEqual([
      'create',
      'send',
      'confirm',
      'ship',
    ])
    expect(nodes.find((node) => node.key === 'receive')?.time).toBeUndefined()
  })

  it('已拒绝订单的时间线终止于拒绝节点并携带原因', () => {
    const nodes = buildOrderTimeline(
      buildOrder({
        status: 'rejected',
        sentAt: '2026-09-12 10:00:00',
        rejectedAt: '2026-09-13 09:00:00',
        rejectReason: '型号缺货',
      }),
    )
    expect(nodes).toHaveLength(3)
    expect(nodes[2]).toMatchObject({ key: 'rejected', color: 'red', note: '型号缺货' })
    // 拒绝后主链节点不应出现在时间线上。
    expect(nodes.some((node) => node.key === 'confirm')).toBe(false)
  })

  it('已作废订单在主链之后追加作废节点并携带原因', () => {
    const nodes = buildOrderTimeline(
      buildOrder({
        status: 'cancelled',
        sentAt: '2026-09-26 10:00:00',
        cancelledAt: '2026-09-27 09:00:00',
        cancelReason: '预算调整',
      }),
    )
    expect(nodes[nodes.length - 1]).toMatchObject({ key: 'cancelled', color: 'red', note: '预算调整' })
    // 作废前已确认的主链节点保留展示（历史事实不抹除）。
    expect(nodes.some((node) => node.key === 'confirm')).toBe(true)
  })
})
