/**
 * 角色标签颜色：内置 6 角色使用与原型一致的固定色，未知编码走哈希兜底，
 * 保证同一角色在不同页面的标签颜色稳定。
 */
const BUILTIN_ROLE_COLORS: Record<string, string> = {
  admin: 'purple',
  purchaser: 'blue',
  approver: 'cyan',
  warehouse: 'gold',
  finance: 'geekblue',
  supplier: 'green',
}

/** 未知角色的兜底色板（antd Tag 内置色，避开品牌主色系以示区分）。 */
const FALLBACK_COLORS = ['volcano', 'orange', 'lime', 'magenta', 'red', 'purple']

/** 返回角色编码对应的 antd Tag color 值。 */
export function roleTagColor(code: string): string {
  const builtin = BUILTIN_ROLE_COLORS[code]
  if (builtin) return builtin
  // 简单字符求和哈希即可满足「稳定且分散」的诉求，无需引入字符串哈希库。
  let hash = 0
  for (const char of code) {
    hash += char.charCodeAt(0)
  }
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
}
