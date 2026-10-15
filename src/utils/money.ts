/**
 * 金额格式化：千分位分隔 + 固定两位小数（单位：元）。
 *
 * 表格与详情中的采购参考价、累计采购额、库存金额等统一走这里，
 * 保证各模块金额展示口径一致。
 */
export function formatMoney(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
