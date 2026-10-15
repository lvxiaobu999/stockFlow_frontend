import dayjs from 'dayjs'

/** 完整时间格式：操作日志等审计场景需要展示到秒。 */
const FULL_FORMAT = 'YYYY-MM-DD HH:mm:ss'
/** 短时间格式：表格空间紧张时（如用户列表「最后登录」）只展示 月-日 时:分。 */
const SHORT_FORMAT = 'MM-DD HH:mm'

/** 无效或缺失时间时的占位文案。 */
const INVALID_PLACEHOLDER = '—'

/**
 * 格式化为「YYYY-MM-DD HH:mm:ss」。
 * 传入无法解析的值时返回占位符，避免表格出现 "Invalid Date"。
 */
export function formatDateTime(value: string | undefined | null): string {
  if (!value) return INVALID_PLACEHOLDER
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format(FULL_FORMAT) : INVALID_PLACEHOLDER
}

/**
 * 格式化为「MM-DD HH:mm」（当前年份内），用于用户列表的最后登录列。
 * 同样对无效值返回占位符。
 */
export function formatShortDateTime(value: string | undefined | null): string {
  if (!value) return INVALID_PLACEHOLDER
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format(SHORT_FORMAT) : INVALID_PLACEHOLDER
}
