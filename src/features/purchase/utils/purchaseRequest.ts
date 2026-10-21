import type { PurchaseRequestStatus } from '@/features/purchase/types'

/** 金额按分取整（避免二进制浮点在 ×100 后出现 11499.999…），返回两位小数。 */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** 行金额（元）= 数量 × 参考单价，与后端 amount 口径一致（两位小数）。 */
export function calcItemAmount(quantity: number, referencePrice: number): number {
  return round2(quantity * referencePrice)
}

/** 明细合计（元）= Σ 行金额；先累加再取整，与后端 totalAmount 的求和顺序一致。 */
export function calcTotalAmount(items: ReadonlyArray<{ quantity: number; referencePrice: number }>): number {
  return round2(items.reduce((sum, item) => sum + item.quantity * item.referencePrice, 0))
}

/** 仅草稿与已拒绝的申请可编辑（已拒绝修改后需重新提交，状态由提交动作翻转）。 */
export function isRequestEditable(status: PurchaseRequestStatus): boolean {
  return status === 'draft' || status === 'rejected'
}
