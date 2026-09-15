import { Typography } from 'antd'

interface PlaceholderPageProps {
  title: string
  description: string
  module?: string
}

/** 业务模块完成前使用的通用占位页面。 */
export default function PlaceholderPage({ title, description, module = '业务模块' }: PlaceholderPageProps) {
  return (
    <div className="placeholder-page">
      <Typography.Title level={2}>{title}</Typography.Title>
      <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        {module} 已完成路由接入，后续业务代码请放在 src/features/{module} 目录。
      </Typography.Paragraph>
    </div>
  )
}
