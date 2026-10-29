import { Button, Card, Checkbox, Form, Input, Select, TreeSelect } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'
import { useCategories } from '@/features/product/hooks/useCategories'
import { toCategoryOptions } from '@/features/product/utils/categoryTree'
import { useWarehouseOptions } from '@/features/inventory/hooks/useWarehouses'

/** 筛选条件（不含分页）；空值字段在 emit 时剔除。 */
export interface StockFilters {
  warehouseId?: string
  categoryId?: string
  keyword?: string
  warningOnly?: boolean
}

interface StockFilterBarProps {
  onSearch: (filters: StockFilters) => void
}

interface FilterFormValues {
  warehouseId?: string
  categoryId?: string
  keyword?: string
  warningOnly?: boolean
}

/** 剔除空值，保持查询参数干净（避免空串进入 query key）。 */
function cleanFilters(values: FilterFormValues): StockFilters {
  const result: StockFilters = {}
  if (values.warehouseId) result.warehouseId = values.warehouseId
  if (values.categoryId) result.categoryId = values.categoryId
  if (values.keyword?.trim()) result.keyword = values.keyword.trim()
  if (values.warningOnly) result.warningOnly = true
  return result
}

/**
 * 库存列表筛选栏：仓库 + 分类树 + 商品关键字 + 仅看预警。
 * 关键字回车 / 点「查询」才提交，其余字段变更即生效（与商品列表同口径）。
 */
export function StockFilterBar({ onSearch }: StockFilterBarProps) {
  const [form] = Form.useForm<FilterFormValues>()
  const { data: warehouseOptions } = useWarehouseOptions()
  const { records: categories } = useCategories()

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
        <Form.Item name="warehouseId">
          <Select placeholder="仓库" allowClear options={warehouseOptions} style={{ width: 150 }} />
        </Form.Item>
        <Form.Item name="categoryId">
          <TreeSelect
            placeholder="商品分类"
            allowClear
            treeDefaultExpandAll
            treeData={toCategoryOptions(categories)}
            style={{ width: 180 }}
          />
        </Form.Item>
        <Form.Item name="keyword">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="商品编码 / 名称 / 规格"
            allowClear
            style={{ width: 200 }}
          />
        </Form.Item>
        <Form.Item name="warningOnly" valuePropName="checked">
          <Checkbox>仅看预警</Checkbox>
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
