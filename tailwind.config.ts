import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#1677ff',
          600: '#0958d9',
          700: '#003eb3',
        },
      },
      boxShadow: {
        panel: '0 4px 18px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config
