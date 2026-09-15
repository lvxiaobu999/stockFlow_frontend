import { AppProviders } from '@/app/providers/AppProviders'
import { NavigationProgress } from '@/components/feedback/NavigationProgress'
import AppRoutes from '@/router'
import './App.css'

export default function App() {
  return (
    <AppProviders>
      <NavigationProgress />
      <AppRoutes />
    </AppProviders>
  )
}
