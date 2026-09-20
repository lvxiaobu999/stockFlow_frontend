import type { Config } from 'tailwindcss'

export default {
  // Tailwind 只扫描这里列出的文件。新增共享组件或业务切片时要覆盖对应文件，
  // 否则生产构建可能会移除未被识别的工具类。
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // 品牌色可以通过 bg-brand-500、text-brand-600 等工具类使用。
      // Ant Design 仍负责主要组件主题，这些颜色主要用于局部布局调整。
      colors: {
        brand: {
          50: '#fceef1',
          100: '#f6dde2',
          500: '#501529',
          600: '#3c0f1e',
          700: '#2c0a16',
        },
      },
      boxShadow: {
        // 轻量自定义容器使用的通用面板阴影。
        panel: '0 4px 18px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  // 只有确实跨多个业务模块复用的 Tailwind 插件才放在这里。
  plugins: [],
} satisfies Config
