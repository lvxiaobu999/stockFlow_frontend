import { describe, expect, it } from 'vitest'
import { maskPhone } from './mask'

describe('maskPhone', () => {
  it('11 位手机号保留前 3 后 4', () => {
    expect(maskPhone('13812346688')).toBe('138****6688')
  })

  it('非 11 位号码保留除末 4 位外的字符', () => {
    expect(maskPhone('057187666888')).toBe('05718766****')
  })

  it('过短号码整体打码', () => {
    expect(maskPhone('1234')).toBe('****')
    expect(maskPhone('')).toBe('****')
  })
})
