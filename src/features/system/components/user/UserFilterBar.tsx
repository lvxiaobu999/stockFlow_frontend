import { Button, Card, Form, Input, Select } from 'antd'
import { RedoOutlined, SearchOutlined } from '@ant-design/icons'
import type { UserType } from '@/features/system/types'

/** 筛选条件（不含分页）；空串字段已在 emit 时剔除，避免拼进 query key。 */
export interface UserFilters {
  keyword?: string
  status?: 1 | 0
  roleCode?: string
  userType?: UserType
}

interface UserFilterBarProps {
  /** 启用中的角色选项（角色编码 → 名称）。 */
  roles: { code: string; name: string }[]
  onSearch: (filters: UserFilters) => void
}

/** 用户类型选项：与后端 UserType 字典保持一致。 */
const USER_TYPE_OPTIONS = [
  { value: 'staff', label: '内部员工' },
  { value: 'supplier', label: '供应商账号' },
]

/** 状态选项：value 用数字 1/0，与 EnableStatus 对齐。 */
const STATUS_OPTIONS = [
  { value: 1, label: '启用' },
  { value: 0, label: '停用' },
]

/** 剔除空串与 undefined，保证「已清空筛选」也能触发一次无过滤查询。 */
function cleanFilters(values: UserFilters): UserFilters {
  const result: UserFilters = {}
  if (values.keyword?.trim()) result.keyword = values.keyword.trim()
  if (values.status !== undefined && values.status !== null) result.status = values.status
  if (values.roleCode) result.roleCode = values.roleCode
  if (values.userType) result.userType = values.userType
  return result
}

/**
 * 用户列表筛选栏：关键字 + 状态 + 角色 + 用户类型。
 *
 * 关键字不跟随输入逐字触发查询（避免每敲一个字发一次请求），回车或点击
 * 「查询」才提交；下拉项变更即生效，减少一次多余点击。
 */
export function UserFilterBar({ roles, onSearch }: UserFilterBarProps) {
  const [form] = Form.useForm<UserFilters>()

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
            placeholder="姓名 / 账号 / 手机号"
            allowClear
            style={{ width: 220 }}
          />
        </Form.Item>
        <Form.Item name="status">
          <Select placeholder="状态" allowClear options={STATUS_OPTIONS} style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="roleCode">
          <Select
            placeholder="角色"
            allowClear
            options={roles.map((role) => ({ value: role.code, label: role.name }))}
            style={{ width: 140 }}
          />
        </Form.Item>
        <Form.Item name="userType">
          <Select placeholder="用户类型" allowClear options={USER_TYPE_OPTIONS} style={{ width: 140 }} />
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
