import { Space, Tag, Typography } from 'antd'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  extra?: ReactNode
}

/** 页面统一头部：标题 + 副标题 + 右侧操作区，保证各页面视觉一致。 */
export function PageHeader({ title, description, extra }: PageHeaderProps) {
  return (
    <div className="page-heading">
      <div>
        <Typography.Title level={2}>{title}</Typography.Title>
        {description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}
      </div>
      {extra ? <Space>{extra}</Space> : null}
    </div>
  )
}

/** 数据更新时间标签，用于提示用户当前展示数据的刷新时刻。 */
export function FreshnessTag({ value }: { value: string }) {
  return <Tag color="blue">数据更新于 {value}</Tag>
}
