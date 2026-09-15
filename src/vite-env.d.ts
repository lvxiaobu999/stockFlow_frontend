/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 开发/预览服务器监听地址（见 vite.config.ts） */
  readonly VITE_HOST?: string
  /** 开发服务器端口 */
  readonly VITE_PORT?: string
  /** 预览服务器端口 */
  readonly VITE_PREVIEW_PORT?: string
  /** 后端 API 根地址，接入真实服务前保持注释状态 */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 构建时注入的应用版本号，见 vite.config.ts 的 `define` */
declare const __APP_VERSION__: string
