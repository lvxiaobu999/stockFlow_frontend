import { App as AntdApp, ConfigProvider, theme } from 'antd'
import { QueryClientProvider } from '@tanstack/react-query'
import zhCN from 'antd/locale/zh_CN'
import type { PropsWithChildren } from 'react'
import { queryClient } from '@/app/queryClient'
import { AppErrorBoundary } from './AppErrorBoundary'

/** 全局 Provider 集中在这里，保持入口文件简洁且启动顺序可预测。 */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 8,
            fontFamily: 'Inter, "PingFang SC", system-ui, sans-serif',
          },
        }}
      >
        <AntdApp>
          <AppErrorBoundary>{children}</AppErrorBoundary>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  )
}
