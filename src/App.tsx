import { AppProviders } from '@/app/providers/AppProviders'
import { NavigationProgress } from '@/components/feedback/NavigationProgress'
import AppRoutes from '@/router'
import './styles/App.less'

/** 应用根组件：包裹全局 Provider，并挂载进度条与路由树。 */
export default function App() {
  return (
    <AppProviders>
      {/* 路由级顶部进度条，监听内部链接与 history 跳转。 */}
      <NavigationProgress />
      <AppRoutes />
    </AppProviders>
  )
}
