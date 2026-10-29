import { Button, Card, DatePicker, Form, Input, Select } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useSupplierOptions } from '@/features/supplier/hooks/useSuppliers'

/** 单据池筛选条件（不含分页）；空值字段在 emit 时剔除。 */
export interface ReconciliationPoolFilters {
  keyword?: string
  supplierId?: string
  receivedFrom?: string
  receivedTo?: string
}

interface ReconciliationPoolFilterBarProps {
  onSearch: (filters: ReconciliationPoolFilters) => void
}

interface FilterFormValues {
  keyword?: string
  supplierId?: string
  receivedRange?: [dayjs.Dayjs, dayjs.Dayjs] | null
}

/** 剔除空值；收货日期范围拆成起止两个 YYYY-MM-DD 参数。 */
function cleanFilters(values: FilterFormValues): ReconciliationPoolFilters {
  const result: ReconciliationPoolFilters = {}
  if (values.keyword?.trim()) result.keyword = values.keyword.trim()
  if (values.supplierId) result.supplierId = values.supplierId
  if (values.receivedRange?.[0]) result.receivedFrom = values.receivedRange[0].format('YYYY-MM-DD')
  if (values.receivedRange?.[1]) result.receivedTo = values.receivedRange[1].format('YYYY-MM-DD')
  return result
}

/** 待对账单据池筛选栏：关键字（订单号 / 收货单号 / 商品名称）+ 供应商 + 收货日期范围。 */
export function ReconciliationPoolFilterBar({ onSearch }: ReconciliationPoolFilterBarProps) {
  const [form] = Form.useForm<FilterFormValues>()
  const { data: supplierOptions } = useSupplierOptions()

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
            placeholder="订单号 / 收货单号 / 商品"
            allowClear
            style={{ width: 210 }}
          />
        </Form.Item>
        <Form.Item name="supplierId">
          <Select
            placeholder="供应商"
            allowClear
            showSearch
            optionFilterProp="label"
            options={supplierOptions}
            style={{ width: 170 }}
          />
        </Form.Item>
        <Form.Item name="receivedRange" label="收货日期">
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
