/** UTF-8 BOM 字符：写入文件头，让 Windows 上的 Excel 正确识别 UTF-8 编码。 */
const CSV_BOM = '﻿'

/** 单元格允许的基础值类型；null/undefined 导出为空字符串。 */
export type CsvCell = string | number | boolean | null | undefined

/**
 * 转义单个 CSV 单元格：包含逗号、引号或换行时用双引号包裹并把内部引号翻倍。
 * 见 RFC 4180；数字与布尔原样输出。（导出以便单测覆盖转义规则）
 */
export function escapeCsvCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return ''
  const text = String(cell)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

/**
 * 把表格数据导出为 CSV 文件并触发浏览器下载。
 *
 * 文件头写入 UTF-8 BOM，保证 Excel 直接打开中文不乱码；MVP 阶段的
 * 「导出 Excel」先用当前页数据走此方法，后续再替换为后端导出接口。
 */
export function downloadCsv(filename: string, header: string[], rows: CsvCell[][]): void {
  const lines = [header, ...rows].map((row) => row.map(escapeCsvCell).join(','))
  // BOM 让 Windows 上的 Excel 识别 UTF-8；不加会导致中文表头乱码。
  const content = `${CSV_BOM}${lines.join('\r\n')}`
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  // 临时 <a> 触发下载后立刻回收，避免内存泄漏。
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
