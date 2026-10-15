import { describe, expect, it } from 'vitest'
import { toPaginationTotal } from './pagination'

describe('toPaginationTotal', () => {
  it('总页数 × 每页条数 换算为 antd 需要的总条数', () => {
    expect(toPaginationTotal(8, 20)).toBe(160)
    expect(toPaginationTotal(1, 20)).toBe(20)
  })

  it('非正数总页数返回 0', () => {
    expect(toPaginationTotal(0, 20)).toBe(0)
    expect(toPaginationTotal(-1, 20)).toBe(0)
  })
})
