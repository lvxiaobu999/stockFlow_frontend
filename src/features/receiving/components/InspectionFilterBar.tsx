import { Button, Card, DatePicker, Form, Input } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

/** 筛选条件（不含分页与结论——结论由列表页页签承载）；空值字段在 emit 时剔除。 */
export interface InspectionFilters {
  keyword?: string
  createdFrom?: string
  createdTo?: string
}

interface InspectionFilterBarProps {
  onSearch: (filters: InspectionFilters) => void
}

interface FilterFormValues {
  keyword?: string
  createdRange?: [dayjs.Dayjs, dayjs.Dayjs] | null
}

/** 剔除空值；时间范围拆成起止两个 YYYY-MM-DD 参数（与查询参数对齐）。 */
function cleanFilters(values: FilterFormValues): InspectionFilters {
  const result: InspectionFilters = {}
  if (values.keyword?.trim()) result.keyword = values.keyword.trim()
  if (values.createdRange?.[0]) result.createdFrom = values.createdRange[0].format('YYYY-MM-DD')
  if (values.createdRange?.[1]) result.createdTo = values.createdRange[1].format('YYYY-MM-DD')
  return result
}

/** 验收单筛选栏：关键字（验收单号 / 收货单号 / 订单号）+ 单据时间范围。 */
export function InspectionFilterBar({ onSearch }: InspectionFilterBarProps) {
  const [form] = Form.useForm<FilterFormValues>()

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
            placeholder="验收单号 / 收货单号 / 订单号"
            allowClear
            style={{ width: 240 }}
          />
        </Form.Item>
        <Form.Item name="createdRange" label="单据时间">
          <DatePicker.RangePicker allowClear style={{ width: 240 }} />
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
