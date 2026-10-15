import { Button, Card, Checkbox, Form, Input, Select } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'

/** 筛选条件（不含分页）；空值字段在 emit 时剔除，避免拼进 query key。 */
export interface SupplierFilters {
  keyword?: string
  status?: 1 | 0
  inTransit?: boolean
}

interface SupplierFilterBarProps {
  onSearch: (filters: SupplierFilters) => void
}

const STATUS_OPTIONS = [
  { value: 1, label: '启用' },
  { value: 0, label: '停用' },
]

/** 剔除空值，保证「已清空筛选」也能触发一次无过滤查询。 */
function cleanFilters(values: SupplierFilters): SupplierFilters {
  const result: SupplierFilters = {}
  if (values.keyword?.trim()) result.keyword = values.keyword.trim()
  if (values.status !== undefined && values.status !== null) result.status = values.status
  if (values.inTransit) result.inTransit = true
  return result
}

/**
 * 供应商筛选栏：关键字 + 状态 + 仅看在途。
 * 关键字回车 / 点「查询」才提交；其余字段变更即生效（与用户/商品列表同口径）。
 */
export function SupplierFilterBar({ onSearch }: SupplierFilterBarProps) {
  const [form] = Form.useForm<SupplierFilters>()

  const emitSearch = () => onSearch(cleanFilters(form.getFieldsValue()))

  return (
    <Card size="small" className="filter-bar">
      <Form
        form={form}
        layout="inline"
        onFinish={emitSearch}
        onValuesChange={(changed) => {
          // 关键字交给回车 / 查询按钮，其余字段即时生效。
          if ('keyword' in changed) return
          emitSearch()
        }}
      >
        <Form.Item name="keyword">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="名称 / 编码"
            allowClear
            style={{ width: 220 }}
          />
        </Form.Item>
        <Form.Item name="status">
          <Select placeholder="状态" allowClear options={STATUS_OPTIONS} style={{ width: 110 }} />
        </Form.Item>
        <Form.Item name="inTransit" valuePropName="checked">
          <Checkbox>仅看在途订单</Checkbox>
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
