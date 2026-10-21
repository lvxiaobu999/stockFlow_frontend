import { Button, Card, DatePicker, Form, Input, Select } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useStaffOptions } from '@/features/system/hooks/useUsers'

/** 筛选条件（不含分页与状态——状态由列表页页签承载）；空值字段在 emit 时剔除。 */
export interface PurchaseRequestFilters {
  keyword?: string
  applicantId?: string
  submittedFrom?: string
  submittedTo?: string
}

interface PurchaseRequestFilterBarProps {
  onSearch: (filters: PurchaseRequestFilters) => void
}

interface FilterFormValues {
  keyword?: string
  applicantId?: string
  submittedRange?: [dayjs.Dayjs, dayjs.Dayjs] | null
}

/** 剔除空值；时间范围拆成起止两个 YYYY-MM-DD 参数（与后端查询参数对齐）。 */
function cleanFilters(values: FilterFormValues): PurchaseRequestFilters {
  const result: PurchaseRequestFilters = {}
  if (values.keyword?.trim()) result.keyword = values.keyword.trim()
  if (values.applicantId) result.applicantId = values.applicantId
  if (values.submittedRange?.[0]) result.submittedFrom = values.submittedRange[0].format('YYYY-MM-DD')
  if (values.submittedRange?.[1]) result.submittedTo = values.submittedRange[1].format('YYYY-MM-DD')
  return result
}

/**
 * 采购申请筛选栏：关键字（编号 / 主题）+ 申请人 + 提交时间范围。
 * 状态筛选由列表页的状态页签承载（原型同时有页签与状态下拉，取页签去重）；
 * 关键字回车 / 点「查询」才提交，其余字段变更即生效（与商品 / 供应商列表同口径）。
 */
export function PurchaseRequestFilterBar({ onSearch }: PurchaseRequestFilterBarProps) {
  const [form] = Form.useForm<FilterFormValues>()
  const { data: staffOptions } = useStaffOptions()

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
            placeholder="申请编号 / 主题"
            allowClear
            style={{ width: 200 }}
          />
        </Form.Item>
        <Form.Item name="applicantId">
          <Select
            placeholder="申请人"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 150 }}
            options={(staffOptions ?? []).map((staff) => ({
              value: staff.id,
              label: staff.department ? `${staff.name} · ${staff.department}` : staff.name,
            }))}
          />
        </Form.Item>
        <Form.Item name="submittedRange" label="提交时间">
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
