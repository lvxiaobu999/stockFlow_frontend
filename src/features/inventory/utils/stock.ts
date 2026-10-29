/**
 * 库存领域纯工具：预警判定与金额口径。
 * 服务端（mock handler）与视图层共用，保证「预警 / 金额」两侧口径一致。
 */

/**
 * 库存状态判定（需求口径：当前库存 ≤ 安全库存即预警，而不是严格小于）。
 */
export function isStockWarning(quantity: number, safetyStock: number): boolean {
  return quantity <= safetyStock
}

/** 库存金额（元）= 数量 × 采购参考价，四舍五入保留 2 位（金额口径避免浮点尾差）。 */
export function calcStockAmount(quantity: number, purchasePrice: number): number {
  return Math.round(quantity * purchasePrice * 100) / 100
}
