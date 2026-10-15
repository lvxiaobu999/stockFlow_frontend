import { Button, Card, Form, Input, Select } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'
import type { EnableStatus } from '@/features/system/types'

/** 角色筛选条件（不含分页）。 */
export interface RoleFilters {
  name?: string
  status?: EnableStatus
}

interface RoleFilterBarProps {
  onSearch: (filters: RoleFilters) => void
}

/** 角色数量少（MVP 固定 6 个），筛选只留名称与状态两项。 */
export function RoleFilterBar({ onSearch }: RoleFilterBarProps) {
  const [form] = Form.useForm<RoleFilters>()

  const emitSearch = () => {
    const values = form.getFieldsValue()
    const filters: RoleFilters = {}
    if (values.name?.trim()) filters.name = values.name.trim()
    if (values.status !== undefined && values.status !== null) filters.status = values.status
    onSearch(filters)
  }

  return (
    <Card size="small" className="filter-bar">
      <Form
        form={form}
        layout="inline"
        onFinish={emitSearch}
        onValuesChange={(changed) => {
          if ('name' in changed) return
          emitSearch()
        }}
      >
        <Form.Item name="name">
          <Input placeholder="角色名称" allowClear style={{ width: 200 }} />
        </Form.Item>
        <Form.Item name="status">
          <Select
            placeholder="状态"
            allowClear
            options={[
              { value: 1, label: '启用' },
              { value: 0, label: '停用' },
            ]}
            style={{ width: 120 }}
          />
        </Form.Item>
        <Form.Item>
          <Button htmlType="submit" type="primary" icon={<SearchOutlined />}>
            查询
          </Button>
        </Form.Item>
        <Form.Item>
          <Button
            icon={<RedoOutlined />}
            onClick={() => {
              form.resetFields()
              onSearch({})
            }}
          >
            重置
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
