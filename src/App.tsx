import { ConfigProvider, theme } from 'antd'
import AppRoutes from '@/router'
import './App.css'

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily: 'Inter, "PingFang SC", system-ui, sans-serif',
        },
      }}
    >
      <AppRoutes />
    </ConfigProvider>
  )
}
