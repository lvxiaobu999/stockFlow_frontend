import { App as AntdApp, ConfigProvider, theme } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import { QueryClientProvider } from '@tanstack/react-query'
import zhCN from 'antd/locale/zh_CN'
import type { PropsWithChildren } from 'react'
import { queryClient } from '@/app/queryClient'
import { AppErrorBoundary } from './AppErrorBoundary'

/** 全局 Provider 集中在这里，保持入口文件简洁且启动顺序可预测。 */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* layer 让 antd 全部组件样式收进 @layer antd，配合 src/styles/index.css
          顶部声明的层级顺序（antd 位于 utilities 之前），使 Tailwind 工具类
          能够覆盖 antd 组件样式——这是 Tailwind v4 级联层机制的官方兼容方案。 */}
      <StyleProvider layer>
        <ConfigProvider
          locale={zhCN}
          theme={{
            // 开启 CSS 变量模式：antd 会把 token 生成为 --ant-* 变量，供自定义样式引用，
            // 换肤时只需改 colorPrimary，所有 var(--ant-*) 会一起更新。
            cssVar: { key: 'stockflow' },
            algorithm: theme.defaultAlgorithm,
            token: {
              colorPrimary: '#501529',
              borderRadius: 8,
              fontFamily: 'Inter, "PingFang SC", system-ui, sans-serif',
            },
          }}
        >
          <AntdApp>
            <AppErrorBoundary>{children}</AppErrorBoundary>
          </AntdApp>
        </ConfigProvider>
      </StyleProvider>
    </QueryClientProvider>
  )
}
