import { Card, Col, Progress, Row, Statistic, Table, Tag, Typography } from 'antd'
import type { TableProps } from 'antd'
import { Link } from 'react-router-dom'

interface InventoryItem {
  key: string
  name: string
  sku: string
  stock: number
  safe: number
  status: string
}

const inventoryColumns: TableProps<InventoryItem>['columns'] = [
  { title: '商品', dataIndex: 'name', key: 'name' },
  { title: 'SKU', dataIndex: 'sku', key: 'sku' },
  {
    title: '当前库存',
    dataIndex: 'stock',
    key: 'stock',
    render: (value: number) => <Typography.Text strong>{value}</Typography.Text>,
  },
  { title: '安全库存', dataIndex: 'safe', key: 'safe' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => <Tag color="error">{status}</Tag>,
  },
]

// TODO: 用类型化的 API service 替换以下 mock 数据。
const inventoryData: InventoryItem[] = [
  { key: '1', name: '无线蓝牙耳机 Pro', sku: 'SFK-10024', stock: 8, safe: 20, status: '库存不足' },
  { key: '2', name: '人体工学办公椅', sku: 'SFK-20017', stock: 12, safe: 15, status: '库存不足' },
  { key: '3', name: 'USB-C 多功能扩展坞', sku: 'SFK-30008', stock: 18, safe: 30, status: '库存不足' },
]

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>工作台</Typography.Title>
          <Typography.Text type="secondary">欢迎回来，管理员。这里是今天的经营概览。</Typography.Text>
        </div>
        <Tag color="blue">数据更新于 10:24</Tag>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="商品总数" value={1284} suffix="件" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="库存总值" value={386.4} precision={1} prefix="¥" suffix="万" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月销售额"
              value={86.2}
              precision={1}
              prefix="¥"
              suffix="万"
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="待处理订单" value={24} suffix="单" valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} lg={16}>
          <Card
            title="库存预警"
            extra={<Link to="/inventory">查看全部</Link>}
          >
            <Table columns={inventoryColumns} dataSource={inventoryData} pagination={false} size="middle" />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="本月销售目标">
            <div className="target-summary">
              <Typography.Title level={2}>¥86.2万</Typography.Title>
              <Typography.Text type="secondary">目标 ¥120万</Typography.Text>
            </div>
            <Progress percent={72} strokeColor="#1677ff" />
            <Typography.Text type="secondary">较上月增长 18.6%</Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
