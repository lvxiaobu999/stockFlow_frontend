import { Button, Card, DatePicker, Form, Input, Select } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { APPROVAL_CONCLUSION_META, type ApprovalConclusion } from '@/features/approval/types'

/** 我已审批筛选条件（不含分页）；空值字段在 emit 时剔除。 */
export interface ApprovalProcessedFilters {
  keyword?: string
  action?: ApprovalConclusion
  processedFrom?: string
  processedTo?: string
}

interface ApprovalProcessedFilterBarProps {
  onSearch: (filters: ApprovalProcessedFilters) => void
}

interface FilterFormValues {
  keyword?: string
  action?: ApprovalConclusion
  processedRange?: [dayjs.Dayjs, dayjs.Dayjs] | null
}

/** 剔除空值；结论时间范围拆成起止两个 YYYY-MM-DD 参数（与后端查询参数对齐）。 */
function cleanFilters(values: FilterFormValues): ApprovalProcessedFilters {
  const result: ApprovalProcessedFilters = {}
  if (values.keyword?.trim()) result.keyword = values.keyword.trim()
  if (values.action) result.action = values.action
  if (values.processedRange?.[0]) result.processedFrom = values.processedRange[0].format('YYYY-MM-DD')
  if (values.processedRange?.[1]) result.processedTo = values.processedRange[1].format('YYYY-MM-DD')
  return result
}

/**
 * 我已审批筛选栏：关键字（编号 / 主题）+ 结论 + 结论时间范围。
 * 关键字回车 / 点「查询」才提交，其余字段变更即生效（与采购申请筛选栏同口径）。
 */
export function ApprovalProcessedFilterBar({ onSearch }: ApprovalProcessedFilterBarProps) {
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
            placeholder="申请编号 / 主题"
            allowClear
            style={{ width: 200 }}
          />
        </Form.Item>
        <Form.Item name="action">
          <Select
            placeholder="审批结论"
            allowClear
            style={{ width: 130 }}
            options={(Object.keys(APPROVAL_CONCLUSION_META) as ApprovalConclusion[]).map((key) => ({
              value: key,
              label: APPROVAL_CONCLUSION_META[key].label,
            }))}
          />
        </Form.Item>
        <Form.Item name="processedRange" label="结论时间">
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
