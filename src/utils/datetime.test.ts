import { describe, expect, it } from 'vitest'
import { formatDateTime, formatShortDateTime } from './datetime'

describe('formatDateTime', () => {
  it('按 YYYY-MM-DD HH:mm:ss 格式化', () => {
    expect(formatDateTime('2026-09-20T14:30:05')).toBe('2026-09-20 14:30:05')
  })

  it('空值与无效值返回占位符', () => {
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('not-a-date')).toBe('—')
  })
})

describe('formatShortDateTime', () => {
  it('按 MM-DD HH:mm 格式化（当前年份内）', () => {
    const year = new Date().getFullYear()
    expect(formatShortDateTime(`${year}-03-05T08:07:00`)).toBe('03-05 08:07')
  })

  it('空值与无效值返回占位符', () => {
    expect(formatShortDateTime('')).toBe('—')
    // dayjs 对超界日期（如 2026-13-99）会进位成合法日期，这里只断言完全不可解析的输入。
    expect(formatShortDateTime('not-a-date')).toBe('—')
  })
})
