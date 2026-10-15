import { describe, expect, it } from 'vitest'
import { isPhoneValid, isUsernameValid } from './validators'

describe('isUsernameValid', () => {
  it('仅字母、数字与下划线时通过', () => {
    expect(isUsernameValid('admin')).toBe(true)
    expect(isUsernameValid('zhangwei_01')).toBe(true)
  })

  it('含中文、空格或连字符时拒绝', () => {
    expect(isUsernameValid('张伟')).toBe(false)
    expect(isUsernameValid('zhang wei')).toBe(false)
    expect(isUsernameValid('zhang-wei')).toBe(false)
    expect(isUsernameValid('')).toBe(false)
  })
})

describe('isPhoneValid', () => {
  it('11 位且以 1 开头时通过', () => {
    expect(isPhoneValid('13812346688')).toBe(true)
  })

  it('位数或首位不符时拒绝', () => {
    expect(isPhoneValid('23812346688')).toBe(false)
    expect(isPhoneValid('1381234668')).toBe(false)
    expect(isPhoneValid('138123466881')).toBe(false)
  })
})
