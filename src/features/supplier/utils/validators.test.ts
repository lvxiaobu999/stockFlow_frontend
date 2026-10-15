import { describe, expect, it } from 'vitest'
import { isSupplierPhoneValid, isTaxNoValid } from './validators'

describe('isSupplierPhoneValid', () => {
  it.each(['13812345678', '0755-26886688', '021-88887777'])('接受手机号 / 座机号 %s', (value) => {
    expect(isSupplierPhoneValid(value)).toBe(true)
  })

  it.each(['', '12345678', '0755268888888', 'abc', '0755-268'])('拒绝非法电话 %s', (value) => {
    expect(isSupplierPhoneValid(value)).toBe(false)
  })
})

describe('isTaxNoValid', () => {
  it.each(['91330100MA27X8975X', '91110000100000000L'])('接受 18 位统一社会信用代码 %s', (value) => {
    expect(isTaxNoValid(value)).toBe(true)
  })

  it.each(['', '91330100MA27X897', '91330100MA27X8975XX', '91330100MA27X8O75X'])('拒绝非法税号 %s', (value) => {
    // 末例含易混字符 O，应被拒。
    expect(isTaxNoValid(value)).toBe(false)
  })
})
