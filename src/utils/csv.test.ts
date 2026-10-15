import { describe, expect, it } from 'vitest'
import { escapeCsvCell } from './csv'

describe('escapeCsvCell', () => {
  it('普通值原样输出，null / undefined 输出空串', () => {
    expect(escapeCsvCell('abc')).toBe('abc')
    expect(escapeCsvCell(12)).toBe('12')
    expect(escapeCsvCell(true)).toBe('true')
    expect(escapeCsvCell(null)).toBe('')
    expect(escapeCsvCell(undefined)).toBe('')
  })

  it('含逗号 / 引号 / 换行时按 RFC 4180 包裹并翻倍引号', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
    expect(escapeCsvCell('说"你好"')).toBe('"说""你好"""')
    expect(escapeCsvCell('多行\n文本')).toBe('"多行\n文本"')
    expect(escapeCsvCell('a,b"c')).toBe('"a,b""c"')
  })
})
