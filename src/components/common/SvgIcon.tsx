import type { CSSProperties } from 'react'

/**
 * 本地 SVG 图标注册表。
 *
 * 用 import.meta.glob 在构建期一次性收集 @/assets/icons 下所有 .svg 的原始内容，
 * 并按「文件名（不含扩展名）」建立索引，供 <SvgIcon name="..."> 按名取用。
 * eager + as: 'raw' 会把图标直接内联进产物，避免运行时逐个发起请求。
 */
const rawIcons: Record<string, string> = import.meta.glob('../../assets/icons/*.svg', {
  eager: true,
  as: 'raw',
})

// glob 的 key 可能是绝对路径（/src/...）或相对路径（../../...），
// 这里统一抽取 basename，让 name 只写文件名即可，不受组件位置影响。
const iconMap = new Map<string, string>(
  Object.entries(rawIcons).map(([path, svg]) => [path.replace(/^.*[/\\]/, '').replace(/\.svg$/, ''), svg]),
)

export interface SvgIconProps {
  /** 图标文件名（不含 .svg 后缀，也可带上），对应 @/assets/icons/ 下的文件，如 "menu-icon-dashboard"。 */
  name: string
  /** 图标尺寸；默认 1em，跟随父级字号（图标本身 width/height 即为 1em）。 */
  size?: number | string
  /** 图标颜色；默认 currentColor 继承文字颜色（图标使用 stroke="currentColor"）。 */
  color?: string
  className?: string
  style?: CSSProperties
}

/** 按名引用本地 SVG 的轻量图标组件，用法：<SvgIcon name="menu-icon-dashboard" />。 */
export function SvgIcon({ name, size = '1em', color = 'currentColor', className, style }: SvgIconProps) {
  const svg = iconMap.get(name.replace(/\.svg$/, ''))
  if (!svg) {
    // 未命中时静默降级，避免一个拼写错误拖垮整页渲染。
    return null
  }
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        lineHeight: 0,
        verticalAlign: '-0.125em',
        fontSize: size,
        color,
        ...style,
      }}
      // SVG 来自仓库内静态文件，内容受控，无注入风险。
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
