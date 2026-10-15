import { describe, expect, it } from 'vitest'
import { isPriceValid, isProductImageValid, isSafetyStockValid } from './validators'

describe('isPriceValid', () => {
  it.each(['0', '12', '12.3', '12.34', '99999999'])('接受合法价格 %s', (value) => {
    expect(isPriceValid(value)).toBe(true)
  })

  it.each(['', '-1', '12.345', '1,234', 'abc', '123456789'])('拒绝非法价格 %s', (value) => {
    expect(isPriceValid(value)).toBe(false)
  })
})

describe('isSafetyStockValid', () => {
  it.each(['0', '10', '9999999'])('接受非负整数 %s', (value) => {
    expect(isSafetyStockValid(value)).toBe(true)
  })

  it.each(['', '-1', '1.5', 'abc', '12345678'])('拒绝非法安全库存 %s', (value) => {
    expect(isSafetyStockValid(value)).toBe(false)
  })
})

describe('isProductImageValid', () => {
  it('接受 JPG / PNG 且不超过 2MB', () => {
    expect(isProductImageValid({ type: 'image/jpeg', size: 1024 })).toEqual({ ok: true })
    expect(isProductImageValid({ type: 'image/png', size: 2 * 1024 * 1024 })).toEqual({ ok: true })
  })

  it('拒绝其他格式', () => {
    expect(isProductImageValid({ type: 'image/gif', size: 10 })).toEqual({
      ok: false,
      reason: '仅支持 JPG / PNG 格式图片',
    })
  })

  it('拒绝超过 2MB 的图片', () => {
    expect(isProductImageValid({ type: 'image/png', size: 2 * 1024 * 1024 + 1 })).toEqual({
      ok: false,
      reason: '图片大小不能超过 2MB',
    })
  })
})
