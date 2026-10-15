import { Button, Card, Checkbox, Form, Input, Select, TreeSelect } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'
import { toCategoryOptions } from '@/features/product/utils/categoryTree'
import type { CategoryRecord } from '@/features/product/types'

/** 筛选条件（不含分页）；空值字段在 emit 时剔除，避免拼进 query key。 */
export interface ProductFilters {
  keyword?: string
  categoryId?: string
  status?: 1 | 0
  stockBelowSafety?: boolean
}

interface ProductFilterBarProps {
  /** 全量扁平分类记录（构建分类树下拉）。 */
  categories: CategoryRecord[]
  onSearch: (filters: ProductFilters) => void
}

const STATUS_OPTIONS = [
  { value: 1, label: '启用' },
  { value: 0, label: '停用' },
]

/** 剔除空值，保证「已清空筛选」也能触发一次无过滤查询。 */
function cleanFilters(values: ProductFilters): ProductFilters {
  const result: ProductFilters = {}
  if (values.keyword?.trim()) result.keyword = values.keyword.trim()
  if (values.categoryId) result.categoryId = values.categoryId
  if (values.status !== undefined && values.status !== null) result.status = values.status
  if (values.stockBelowSafety) result.stockBelowSafety = true
  return result
}

/**
 * 商品列表筛选栏：关键字 + 分类树 + 状态 + 仅看预警。
 *
 * 关键字回车 / 点「查询」才提交；其余字段变更即生效（与用户列表同口径）。
 * 分类下拉为树形，选中任意层级即匹配「该分类及其子分类」。
 */
export function ProductFilterBar({ categories, onSearch }: ProductFilterBarProps) {
  const [form] = Form.useForm<ProductFilters>()

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
            placeholder="编码 / 名称 / 规格"
            allowClear
            style={{ width: 200 }}
          />
        </Form.Item>
        <Form.Item name="categoryId">
          <TreeSelect
            placeholder="商品分类"
            allowClear
            treeDefaultExpandAll
            treeData={toCategoryOptions(categories)}
            style={{ width: 200 }}
          />
        </Form.Item>
        <Form.Item name="status">
          <Select placeholder="状态" allowClear options={STATUS_OPTIONS} style={{ width: 110 }} />
        </Form.Item>
        <Form.Item name="stockBelowSafety" valuePropName="checked">
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
