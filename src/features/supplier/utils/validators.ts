/**
 * 供应商档案表单校验纯函数。
 *
 * 与 antd Form 解耦，方便单元测试；组件里的 Form.Item rules 只做薄封装。
 */

/**
 * 联系电话规则：11 位手机号，或「区号-号码」座机号（如 0755-26886688）。
 * 供应商常用座机，与系统用户的纯手机号口径（isPhoneValid）不同。
 */
export function isSupplierPhoneValid(value: string): boolean {
  return /^1\d{10}$/.test(value) || /^0\d{2,3}-\d{7,8}$/.test(value)
}

/** 纳税人识别号规则：18 位统一社会信用代码（不含 I/O/S/V/Z 等易混字符）。 */
export function isTaxNoValid(value: string): boolean {
  return /^[0-9A-HJ-NPQRTUWXY]{18}$/.test(value)
}
