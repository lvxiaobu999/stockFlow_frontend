import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { appEnv } from '@/config/env'
import './index.css'
import App from './App.tsx'

async function prepareMockServer() {
  if (!import.meta.env.DEV || !appEnv.useMockApi) return

  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

async function bootstrap() {
  try {
    await prepareMockServer()
  } catch (error: unknown) {
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

void bootstrap()
