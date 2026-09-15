import { Space, Tag, Typography } from 'antd'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  extra?: ReactNode
}

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

export function FreshnessTag({ value }: { value: string }) {
  return <Tag color="blue">数据更新于 {value}</Tag>
}
