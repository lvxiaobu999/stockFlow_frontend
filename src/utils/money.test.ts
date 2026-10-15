import { describe, expect, it } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('千分位分隔并保留两位小数', () => {
    expect(formatMoney(1234.5)).toBe('1,234.50')
    expect(formatMoney(4599)).toBe('4,599.00')
    expect(formatMoney(0)).toBe('0.00')
  })

  it('两位以上小数四舍五入到两位', () => {
    expect(formatMoney(12.567)).toBe('12.57')
  })
})
