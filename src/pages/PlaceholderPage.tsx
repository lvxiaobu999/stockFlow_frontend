import { Typography } from 'antd'

interface PlaceholderPageProps {
  title: string
  description: string
}

/** 尚未实现的业务页面的占位组件，接入真实功能后逐步替换。 */
export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="placeholder-page">
      <Typography.Title level={2}>{title}</Typography.Title>
      <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
    </div>
  )
}
