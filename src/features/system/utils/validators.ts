/**
 * 系统管理表单校验纯函数。
 *
 * 与 antd Form 解耦，方便单元测试；组件里的 Form.Item rules 只做薄封装。
 */

/** 登录账号规则：仅字母、数字与下划线（后端唯一性校验另行处理）。 */
export function isUsernameValid(value: string): boolean {
  return /^[A-Za-z0-9_]+$/.test(value)
}

/** 手机号规则：11 位、以 1 开头。 */
export function isPhoneValid(value: string): boolean {
  return /^1\d{10}$/.test(value)
}
