import { Button, Result } from 'antd'
import type { ErrorInfo, PropsWithChildren, ReactNode } from 'react'
import { Component } from 'react'

interface AppErrorBoundaryState {
  hasError: boolean
}

interface AppErrorBoundaryProps extends PropsWithChildren {
  fallback?: ReactNode
}

/** 捕获渲染错误并提供兜底界面，避免单个业务模块导致整页空白。 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  // 渲染阶段捕获到错误后立即标记，避免状态更新引发二次渲染报错。
  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  // 记录错误详情；生产环境不打印完整堆栈，避免信息过度暴露。
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('StockFlow render error', error, info)
    }
  }

  // 兜底界面唯一操作：整页刷新，适合可恢复的临时错误。
  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return (
      <Result
        status="error"
        title="页面发生错误"
        subTitle="请刷新页面重试；如果问题持续，请联系系统管理员。"
        extra={
          <Button type="primary" onClick={this.handleReload}>
            刷新页面
          </Button>
        }
      />
    )
  }
}
