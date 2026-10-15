/**
 * 手机号 / 电话号码脱敏展示。
 *
 * 规则：11 位手机号保留前 3 后 4（138****6688）；其它号码（如固话 0571-87666888）
 * 保留除末 4 位外的全部字符，避免联系人信息在列表中完整暴露。
 */
export function maskPhone(phone: string): string {
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`
  }
  // 过短的号码没有可保留前缀，整体打码，防止泄露。
  if (phone.length <= 4) return '****'
  return `${phone.slice(0, phone.length - 4)}****`
}
