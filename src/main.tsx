import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { appEnv } from '@/config/env'
import './styles/index.css'
import App from './App.tsx'

/** 在开发环境按需启动 MSW，拦截匹配的接口请求；Mock 未启用时直接跳过。 */
async function prepareMockServer() {
  // 仅开发环境且显式开启 Mock 时才加载 worker，避免生产包引入 msw 代码。
  if (!import.meta.env.DEV || !appEnv.useMockApi) return

  // 动态导入让 msw 及其 handler 独立分包，未开启 Mock 时完全不下载。
  const { worker } = await import('@/mocks/browser')
  // 未匹配到 handler 的请求放行到真实后端，保证 Mock 不影响其它接口。
  await worker.start({ onUnhandledRequest: 'bypass' })
}

/** 应用启动入口：先准备好 Mock 服务，再挂载 React 根节点。 */
async function bootstrap() {
  try {
    await prepareMockServer()
  } catch (error: unknown) {
    // Mock 启动失败不阻断应用，降级为请求真实 API。
    console.error('Mock 服务启动失败，将继续使用真实 API', error)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

// 顶层自执行，显式忽略返回的 Promise，交由内部 try/catch 处理。
void bootstrap()
