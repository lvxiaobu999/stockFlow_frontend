import { describe, expect, it } from 'vitest'
import { isNewPasswordValid } from './validators'

describe('isNewPasswordValid', () => {
  it('8-20 位且同时包含字母与数字时通过', () => {
    expect(isNewPasswordValid('Zq@20260920')).toBe(true)
    expect(isNewPasswordValid('abcd1234')).toBe(true)
    expect(isNewPasswordValid('a1')).toBe(false)
  })

  it('长度不符或缺少字符类型时拒绝', () => {
    expect(isNewPasswordValid('a1b2c3d')).toBe(false) // 7 位过短
    expect(isNewPasswordValid('a'.repeat(21) + '1')).toBe(false) // 超过 20 位
    expect(isNewPasswordValid('12345678')).toBe(false) // 缺字母
    expect(isNewPasswordValid('abcdefgh')).toBe(false) // 缺数字
  })
})
