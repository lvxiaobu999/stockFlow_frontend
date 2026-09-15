import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

const projectRoot = dirname(fileURLToPath(import.meta.url))

/**
 * Vite configuration shared by local development, preview and production builds.
 * Keep environment specific values in `.env.*` files and expose only `VITE_*` keys.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    resolve: {
      alias: {
        '@': resolve(projectRoot, 'src'),
      },
    },
    server: {
      host: env.VITE_HOST || 'localhost',
      port: Number(env.VITE_PORT) || 5173,
      strictPort: true,
      open: false,
    },
    preview: {
      host: env.VITE_HOST || 'localhost',
      port: Number(env.VITE_PREVIEW_PORT) || 4173,
      strictPort: true,
    },
    build: {
      target: 'es2022',
      sourcemap: mode === 'production',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design/icons')) return 'antd'
            if (id.includes('node_modules/react-router')) return 'router'
            return undefined
          },
        },
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    },
  }
})
