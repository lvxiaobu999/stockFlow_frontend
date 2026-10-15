import { Button, Card, DatePicker, Form, Input, Select } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import type { LogFilterOptions } from '@/features/system/types'

/** 日志筛选条件（不含分页）；时间为 ISO 字符串（含端点）。 */
export interface LogFilters {
  operator?: string
  module?: string
  startTime?: string
  endTime?: string
  keyword?: string
}

interface LogFilterBarProps {
  options: LogFilterOptions | null
  onSearch: (filters: LogFilters) => void
}

/** RangePicker 的表单值类型（dayjs 对组）。 */
type TimeRange = [Dayjs | null, Dayjs | null] | null

/** 操作日志筛选栏：操作人 + 模块 + 时间范围 + 关键字，全部由「查询」统一提交。 */
export function LogFilterBar({ options, onSearch }: LogFilterBarProps) {
  const [form] = Form.useForm<{ operator?: string; module?: string; time?: TimeRange; keyword?: string }>()

  const emitSearch = () => {
    const values = form.getFieldsValue()
    const filters: LogFilters = {}
    if (values.operator) filters.operator = values.operator
    if (values.module) filters.module = values.module
    if (values.keyword?.trim()) filters.keyword = values.keyword.trim()
    if (values.time?.[0]) filters.startTime = values.time[0].startOf('day').toISOString()
    if (values.time?.[1]) filters.endTime = values.time[1].endOf('day').toISOString()
    onSearch(filters)
  }

  return (
    <Card size="small" className="filter-bar">
      <Form form={form} layout="inline" onFinish={emitSearch}>
        <Form.Item name="operator">
          <Select
            placeholder="操作人"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={!options}
            options={(options?.operators ?? []).map((operator) => ({ value: operator, label: operator }))}
            style={{ width: 130 }}
          />
        </Form.Item>
        <Form.Item name="module">
          <Select placeholder="模块" allowClear options={options?.modules ?? []} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="time">
          <DatePicker.RangePicker
            // 日志保留 180 天，禁选未来与超出保留期的日期。
            disabledDate={(current) =>
              current.isAfter(dayjs(), 'day') || current.isBefore(dayjs().subtract(180, 'day'), 'day')
            }
          />
        </Form.Item>
        <Form.Item name="keyword">
          <Input placeholder="动作 / 对象 / IP" allowClear style={{ width: 180 }} onPressEnter={() => form.submit()} />
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
