/**
 * 认证相关表单校验纯函数。
 *
 * 与 antd Form 解耦，方便单元测试；组件里的 Form.Item rules 只做薄封装。
 */

/** 修改密码的新密码规则：8-20 位且同时包含字母与数字（MVP 不强制特殊字符）。 */
export function isNewPasswordValid(value: string): boolean {
  if (value.length < 8 || value.length > 20) return false
  return /[A-Za-z]/.test(value) && /\d/.test(value)
}
