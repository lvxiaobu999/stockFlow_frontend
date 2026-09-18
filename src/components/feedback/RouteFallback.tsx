import { Spin } from 'antd'

/** 懒加载路由在分包下载期间的加载占位，避免页面闪白。 */
export function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-label="页面加载中">
      <Spin size="large" />
    </div>
  )
}
