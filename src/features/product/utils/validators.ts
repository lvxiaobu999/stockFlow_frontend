/**
 * 商品档案表单校验纯函数。
 *
 * 与 antd Form 解耦，方便单元测试；组件里的 Form.Item rules 只做薄封装。
 */

/** 价格规则：非负、整数部分最多 8 位、最多两位小数（对应 DECIMAL(12,2) 前端口径）。 */
export function isPriceValid(value: string): boolean {
  return /^\d{1,8}(\.\d{1,2})?$/.test(value)
}

/** 安全库存规则：非负整数，最多 7 位。 */
export function isSafetyStockValid(value: string): boolean {
  return /^\d{1,7}$/.test(value)
}

/** 商品主图上限：2MB（原型口径）。 */
export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024

/** 商品主图规则：仅 JPG / PNG，不超过 2MB；返回原因便于 Form rules 直接展示。 */
export function isProductImageValid(file: Pick<File, 'type' | 'size'>): { ok: true } | { ok: false; reason: string } {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    return { ok: false, reason: '仅支持 JPG / PNG 格式图片' }
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return { ok: false, reason: '图片大小不能超过 2MB' }
  }
  return { ok: true }
}
