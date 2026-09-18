import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

const projectRoot = dirname(fileURLToPath(import.meta.url))

/**
 * Vite 配置同时服务于开发、预览和生产构建。
 * 环境差异放在 .env.* 文件中，浏览器端只允许暴露 VITE_* 变量。
 */
export default defineConfig(({ mode }) => {
  // loadEnv 会读取 .env、.env.local 以及当前 mode 对应的环境文件。
  // 浏览器代码只能使用 VITE_* 变量，服务端密钥不能放进这个对象。
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // 开发和生产环境都启用 React Compiler，以保持组件优化策略一致。
    // 后续增加 Vite 插件时请保持这里的插件顺序稳定。
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    resolve: {
      // 使用 @/* 作为应用导入别名，避免移动业务目录后出现脆弱的相对路径链。
      alias: {
        '@': resolve(projectRoot, 'src'),
      },
    },
    server: {
      // 本地开发服务器。strictPort 可以避免端口被占用时静默切换端口。
      host: env.VITE_HOST || 'localhost',
      port: Number(env.VITE_PORT) || 5173,
      strictPort: true,
      open: false,
    },
    preview: {
      // 类生产预览服务器，与开发端口保持独立。
      host: env.VITE_HOST || 'localhost',
      port: Number(env.VITE_PREVIEW_PORT) || 4173,
      strictPort: true,
    },
    build: {
      // ES2022 在支持现代浏览器的同时，可以保持产物体积相对紧凑。
      target: 'es2022',
      sourcemap: mode === 'production',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // 将体积较大的 Ant Design 和路由依赖拆成稳定、可预测的 chunk。
          // 业务模块只有在完成体积评估后再增加专属 chunk。
          manualChunks(id) {
            if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design/icons')) return 'antd'
            if (id.includes('node_modules/react-router')) return 'router'
            return undefined
          },
        },
      },
    },
    define: {
      // 这是构建时元数据，不是运行时密钥。
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    },
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  }
})
