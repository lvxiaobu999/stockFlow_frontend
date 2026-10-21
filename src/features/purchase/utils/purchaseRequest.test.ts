import { describe, expect, it } from 'vitest'
import { calcItemAmount, calcTotalAmount, isRequestEditable } from './purchaseRequest'

/** 金额与状态判断的纯工具：口径必须与后端一致（两位小数、Σ 行金额）。 */
describe('采购申请纯工具', () => {
  it('行金额 = 数量 × 参考价，两位小数', () => {
    expect(calcItemAmount(40, 290)).toBe(11600)
    expect(calcItemAmount(3, 105.5)).toBe(316.5)
    // 浮点边界：0.1 × 3 不出现 0.30000000000000004。
    expect(calcItemAmount(3, 0.1)).toBe(0.3)
  })

  it('合计 = Σ 行金额（先累加再取整）', () => {
    expect(
      calcTotalAmount([
        { quantity: 40, referencePrice: 290 },
        { quantity: 30, referencePrice: 185 },
      ]),
    ).toBe(17150)
    expect(calcTotalAmount([])).toBe(0)
  })

  it('仅草稿与已拒绝可编辑', () => {
    expect(isRequestEditable('draft')).toBe(true)
    expect(isRequestEditable('rejected')).toBe(true)
    expect(isRequestEditable('pending')).toBe(false)
    expect(isRequestEditable('approved')).toBe(false)
    expect(isRequestEditable('ordered')).toBe(false)
  })
})
