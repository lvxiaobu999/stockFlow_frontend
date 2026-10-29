import { Card, DatePicker, Form, Input, Select, Button } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useSupplierOptions } from '@/features/supplier/hooks/useSuppliers'
import { RECONCILIATION_STATUS_META, type ReconciliationStatus } from '../types'

/** 筛选条件（不含分页）；空值字段在 emit 时剔除。 */
export interface ReconciliationFilters {
  keyword?: string
  supplierId?: string
  status?: ReconciliationStatus
  periodFrom?: string
  periodTo?: string
}

interface ReconciliationFilterBarProps {
  onSearch: (filters: ReconciliationFilters) => void
}

interface FilterFormValues {
  keyword?: string
  supplierId?: string
  status?: ReconciliationStatus
  periodRange?: [dayjs.Dayjs, dayjs.Dayjs] | null
}

/** 状态下拉项：由状态字典生成，保持单一口径。 */
const STATUS_OPTIONS = (Object.keys(RECONCILIATION_STATUS_META) as ReconciliationStatus[]).map((status) => ({
  value: status,
  label: RECONCILIATION_STATUS_META[status].label,
}))

/** 剔除空值；期间范围拆成起止两个 YYYY-MM-DD 参数（与查询参数对齐）。 */
function cleanFilters(values: FilterFormValues): ReconciliationFilters {
  const result: ReconciliationFilters = {}
  if (values.keyword?.trim()) result.keyword = values.keyword.trim()
  if (values.supplierId) result.supplierId = values.supplierId
  if (values.status) result.status = values.status
  if (values.periodRange?.[0]) result.periodFrom = values.periodRange[0].format('YYYY-MM-DD')
  if (values.periodRange?.[1]) result.periodTo = values.periodRange[1].format('YYYY-MM-DD')
  return result
}

/**
 * 对账单筛选栏：关键字（对账单号 / 供应商名称）+ 供应商 + 状态 + 对账期间范围。
 * 期间筛选为「与单据期间有交集即命中」；关键字回车 / 点「查询」才提交，其余字段变更即生效。
 */
export function ReconciliationFilterBar({ onSearch }: ReconciliationFilterBarProps) {
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
            placeholder="对账单号 / 供应商"
            allowClear
            style={{ width: 190 }}
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
        <Form.Item name="status">
          <Select placeholder="状态" allowClear options={STATUS_OPTIONS} style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="periodRange" label="对账期间">
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
