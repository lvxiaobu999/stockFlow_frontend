import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/** 浏览器端 MSW worker，由 main.tsx 在开发环境按需启动。 */
export const worker = setupWorker(...handlers)
