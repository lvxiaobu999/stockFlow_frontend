/**
 * Stylelint 配置。
 *
 * - `stylelint-config-standard`：Stylelint 官方标准规则集，负责 CSS 最佳实践校验；
 * - `@dreamsicle.io/stylelint-config-tailwindcss`：面向 Tailwind v4 的配套配置，
 *   它把 `@theme`、`@utility`、`@apply`、`@source` 等指令和 `theme()` 等函数注册为
 *   Stylelint 的合法语法（languageOptions.syntax），而不是简单地忽略它们，
 *   因此 Tailwind 入口样式既能被完整校验，又不会触发 at-rule-no-unknown 误报。
 *   注意：该配置要求 Tailwind v4+，所以它依赖上面的 `@import 'tailwindcss'` CSS 优先写法。
 */
/** @type {import('stylelint').Config} */
const config = {
  extends: ['stylelint-config-standard', '@dreamsicle.io/stylelint-config-tailwindcss'],
  overrides: [
    {
      // Less 样式（App.less）由 Vite 编译；postcss-less 让 Stylelint 理解
      // 嵌套语法与 `//` 行注释，否则会按纯 CSS 解析而报错。
      files: ['**/*.less'],
      customSyntax: 'postcss-less',
    },
  ],
}

export default config
