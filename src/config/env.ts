/** 浏览器安全配置。Vite 只会将 VITE_* 变量暴露给浏览器代码。 */
export interface AppEnv {
  apiBaseUrl: string
  appName: string
  useMockApi: boolean
  /**
   * 开发演示账号（来自 VITE_DEMO_USERNAME / VITE_DEMO_PASSWORD），登录表单据此预填。
   * 仅在「开发 + Mock」模式下解析，生产构建恒为 null——演示口令不允许带进生产。
   */
  demoLogin: { username: string; password: string } | null
}

/** 解析字符串形式的布尔环境变量，仅 "true" 或 "1" 视为开启，其余视为关闭。 */
function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  // 变量未设置时回退到默认值，避免解析结果出现 NaN 或空字符串误判。
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true' || value === '1'
}

/** 集中读取并规范化 Vite 暴露的环境变量，运行期只调用一次。 */
function readEnv(): AppEnv {
  // 开发环境默认开启 Mock，生产环境默认走真实 API，均可通过变量覆盖。
  const useMockApi = parseBoolean(import.meta.env.VITE_USE_MOCK_API, import.meta.env.DEV)
  // 演示账号三个条件缺一不可：DEV 构建 + Mock 开启 + 两个变量都配置完整，
  // 防止半配置或生产误配导致登录表单出现残缺/多余的预填。
  const demoUsername = import.meta.env.VITE_DEMO_USERNAME ?? ''
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD ?? ''

  return {
    // API 地址缺失时回退到同源 /api，避免部署配置遗漏导致请求打到绝对地址。
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
    appName: import.meta.env.VITE_APP_NAME ?? 'StockFlow',
    useMockApi,
    demoLogin:
      import.meta.env.DEV && useMockApi && demoUsername && demoPassword
        ? { username: demoUsername, password: demoPassword }
        : null,
  }
}

/** 全局唯一的环境配置实例，模块加载时立即求值。 */
export const appEnv = readEnv()
