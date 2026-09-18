/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOST?: string
  readonly VITE_PORT?: string
  readonly VITE_PREVIEW_PORT?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_USE_MOCK_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 构建时注入的应用版本号，由 vite.config.ts 的 define 提供，用于侧边栏展示。 */
declare const __APP_VERSION__: string
