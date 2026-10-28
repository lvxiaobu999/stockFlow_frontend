import { Button, Card, DatePicker, Form, Input, Select } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useSupplierOptions } from '@/features/supplier/hooks/useSuppliers'

/** 筛选条件（不含分页与状态——状态由列表页页签承载）；空值字段在 emit 时剔除。 */
export interface PurchaseOrderFilters {
  keyword?: string
  supplierId?: string
  createdFrom?: string
  createdTo?: string
}

interface PurchaseOrderFilterBarProps {
  onSearch: (filters: PurchaseOrderFilters) => void
}

interface FilterFormValues {
  keyword?: string
  supplierId?: string
  createdRange?: [dayjs.Dayjs, dayjs.Dayjs] | null
}

/** 剔除空值；时间范围拆成起止两个 YYYY-MM-DD 参数（与后端查询参数对齐）。 */
function cleanFilters(values: FilterFormValues): PurchaseOrderFilters {
  const result: PurchaseOrderFilters = {}
  if (values.keyword?.trim()) result.keyword = values.keyword.trim()
  if (values.supplierId) result.supplierId = values.supplierId
  if (values.createdRange?.[0]) result.createdFrom = values.createdRange[0].format('YYYY-MM-DD')
  if (values.createdRange?.[1]) result.createdTo = values.createdRange[1].format('YYYY-MM-DD')
  return result
}

/**
 * 采购订单筛选栏：关键字（订单编号 / 来源申请编码）+ 供应商 + 创建时间范围。
 * 状态筛选由列表页的状态页签承载（与采购申请列表同口径）；
 * 关键字回车 / 点「查询」才提交，其余字段变更即生效。
 */
export function PurchaseOrderFilterBar({ onSearch }: PurchaseOrderFilterBarProps) {
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
            placeholder="订单编号 / 来源申请"
            allowClear
            style={{ width: 200 }}
          />
        </Form.Item>
        <Form.Item name="supplierId">
          <Select
            placeholder="供应商"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            options={(supplierOptions ?? []).map((supplier) => ({
              value: supplier.id,
              label: `${supplier.name} · ${supplier.contactPerson}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="createdRange" label="创建时间">
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
