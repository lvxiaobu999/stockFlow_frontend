/** 将数值限制在 [min, max] 区间内；超出边界时返回最近的边界值。 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
