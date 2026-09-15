/** 浏览器安全配置。Vite 只会将 VITE_* 变量暴露给浏览器代码。 */
export interface AppEnv {
  apiBaseUrl: string
  appName: string
  useMockApi: boolean
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true' || value === '1'
}

function readEnv(): AppEnv {
  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
    appName: import.meta.env.VITE_APP_NAME ?? 'StockFlow',
    useMockApi: parseBoolean(import.meta.env.VITE_USE_MOCK_API, import.meta.env.DEV),
  }
}

export const appEnv = readEnv()
