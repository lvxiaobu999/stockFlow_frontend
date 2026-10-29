import { Button, Card, DatePicker, Form, Input, Select } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { STOCK_TRANSACTION_TYPE_META } from '@/features/inventory/types'
import type { StockTransactionType } from '@/features/inventory/types'
import { useWarehouseOptions } from '@/features/inventory/hooks/useWarehouses'

/** 筛选条件（不含分页）；空值字段在 emit 时剔除。 */
export interface StockTransactionFilters {
  warehouseId?: string
  productId?: string
  type?: StockTransactionType
  keyword?: string
  createdFrom?: string
  createdTo?: string
}

interface StockTransactionFilterBarProps {
  /** 初始值：库存列表「查看流水」深链带入（仓库 + 商品 / 关键字）。 */
  initialValues?: StockTransactionFilters
  onSearch: (filters: StockTransactionFilters) => void
}

interface FilterFormValues {
  warehouseId?: string
  type?: StockTransactionType
  keyword?: string
  createdRange?: [dayjs.Dayjs, dayjs.Dayjs] | null
}

/** 变动类型下拉（含「全部」由清空表达）。 */
const TYPE_OPTIONS = (Object.keys(STOCK_TRANSACTION_TYPE_META) as StockTransactionType[]).map((type) => ({
  label: STOCK_TRANSACTION_TYPE_META[type].label,
  value: type,
}))

/** 剔除空值；时间范围拆成起止两个 YYYY-MM-DD 参数（与查询参数对齐）。 */
function cleanFilters(values: FilterFormValues): StockTransactionFilters {
  const result: StockTransactionFilters = {}
  if (values.warehouseId) result.warehouseId = values.warehouseId
  if (values.type) result.type = values.type
  if (values.keyword?.trim()) result.keyword = values.keyword.trim()
  if (values.createdRange?.[0]) result.createdFrom = values.createdRange[0].format('YYYY-MM-DD')
  if (values.createdRange?.[1]) result.createdTo = values.createdRange[1].format('YYYY-MM-DD')
  return result
}

/**
 * 库存流水筛选栏：关键字（单据号 / 商品）+ 仓库 + 变动类型 + 时间范围。
 * 深链带入的初始筛选随表单初值生效；关键字回车 / 点「查询」才提交。
 */
export function StockTransactionFilterBar({ initialValues, onSearch }: StockTransactionFilterBarProps) {
  const [form] = Form.useForm<FilterFormValues>()
  const { data: warehouseOptions } = useWarehouseOptions()

  const emitSearch = () => onSearch(cleanFilters(form.getFieldsValue()))

  return (
    <Card size="small" className="filter-bar">
      <Form
        form={form}
        layout="inline"
        initialValues={
          initialValues?.warehouseId || initialValues?.keyword
            ? { warehouseId: initialValues.warehouseId, keyword: initialValues.keyword }
            : undefined
        }
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
            placeholder="单据号 / 商品编码 / 名称"
            allowClear
            style={{ width: 200 }}
          />
        </Form.Item>
        <Form.Item name="warehouseId">
          <Select placeholder="仓库" allowClear options={warehouseOptions} style={{ width: 150 }} />
        </Form.Item>
        <Form.Item name="type">
          <Select placeholder="变动类型" allowClear options={TYPE_OPTIONS} style={{ width: 130 }} />
        </Form.Item>
        <Form.Item name="createdRange" label="发生时间">
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
