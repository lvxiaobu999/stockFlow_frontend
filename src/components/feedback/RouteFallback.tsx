import { Spin } from 'antd'

export function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-label="页面加载中">
      <Spin size="large" />
    </div>
  )
}
