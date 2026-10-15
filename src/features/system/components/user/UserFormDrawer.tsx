import { useEffect } from 'react'
import { App, Button, Divider, Drawer, Form, Input, Radio, Select } from 'antd'
import { useRoleOptions } from '@/features/system/hooks/useRoles'
import { useUserMutations } from '@/features/system/hooks/useUserMutations'
import { isNewPasswordValid } from '@/features/auth/utils/validators'
import { isPhoneValid, isUsernameValid } from '@/features/system/utils/validators'
import type { EnableStatus, UpdateUserPayload, UserRecord, UserType } from '@/features/system/types'

interface UserFormDrawerProps {
  open: boolean
  /** 编辑目标；null 表示新建。 */
  user: UserRecord | null
  onClose: () => void
}

/** 表单值结构；username/password 仅新建时提交，编辑时被剔除。 */
interface UserFormValues {
  username: string
  name: string
  phone: string
  email?: string
  department?: string
  userType: UserType
  roleCodes: string[]
  status: EnableStatus
  password?: string
  remark?: string
}

/** 新建时的默认值：默认内部员工 + 启用，减少录入成本。 */
const INITIAL_VALUES: Partial<UserFormValues> = {
  userType: 'staff',
  status: 1,
}

/**
 * 用户新建 / 编辑抽屉（720px）。
 *
 * - 新建：登录账号可填（正则校验），初始密码可留空走系统默认密码；
 * - 编辑：账号与密码字段隐藏/禁用（账号创建后不可改，改密走「重置密码」）；
 * - 提交由 useUserMutations 处理，缓存失效在 hook 内完成。
 */
export function UserFormDrawer({ open, user, onClose }: UserFormDrawerProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<UserFormValues>()
  const { data: roleOptions } = useRoleOptions()
  const { create, update } = useUserMutations()
  const isEdit = user !== null

  // 打开时回填：编辑带入角色编码列表，新建重置为默认值。
  useEffect(() => {
    if (!open) return
    if (user) {
      form.setFieldsValue({
        username: user.username,
        name: user.name,
        phone: user.phone,
        email: user.email,
        department: user.department,
        userType: user.userType,
        roleCodes: user.roles.map((role) => role.code),
        status: user.status,
        remark: user.remark,
      })
    } else {
      form.resetFields()
    }
  }, [open, user, form])

  const handleSubmit = (values: UserFormValues) => {
    if (isEdit && user) {
      // 编辑载荷不含 username/password（类型层面约束），显式逐字段构造以杜绝误传。
      const payload: UpdateUserPayload = {
        name: values.name,
        phone: values.phone,
        email: values.email,
        department: values.department,
        userType: values.userType,
        roleCodes: values.roleCodes,
        status: values.status,
        remark: values.remark,
      }
      update.mutate(
        { id: user.id, payload },
        {
          onSuccess: () => {
            message.success(`用户 ${values.name} 已更新`)
            onClose()
          },
          onError: (error) => message.error(error.message),
        },
      )
      return
    }
    create.mutate(values, {
      onSuccess: () => {
        message.success(`用户 ${values.name} 创建成功`)
        onClose()
      },
      onError: (error) => message.error(error.message),
    })
  }

  const submitting = create.isPending || update.isPending

  return (
    <Drawer
      title={isEdit ? `编辑用户 · ${user?.name}` : '新建用户'}
      width={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Form<UserFormValues> form={form} layout="vertical" initialValues={INITIAL_VALUES} onFinish={handleSubmit}>
        {/* antd 6 起 Divider 的 orientation 只表示方向，文字位置改用 titlePlacement。 */}
        <Divider plain titlePlacement="start">
          账号信息
        </Divider>
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <Form.Item
            label="登录账号"
            name="username"
            extra="仅字母、数字与下划线，创建后不可修改"
            rules={[
              { required: !isEdit, message: '请输入登录账号' },
              {
                validator: (_rule, value: string) =>
                  !value || isUsernameValid(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error('仅支持字母、数字与下划线')),
              },
            ]}
          >
            <Input placeholder="如 wangfang" disabled={isEdit} autoComplete="off" />
          </Form.Item>
          {!isEdit ? (
            <Form.Item
              label="初始密码"
              name="password"
              extra="留空则使用系统默认密码，8-20 位且同时包含字母与数字"
              rules={[
                {
                  validator: (_rule, value?: string) =>
                    !value || isNewPasswordValid(value)
                      ? Promise.resolve()
                      : Promise.reject(new Error('密码需 8-20 位且同时包含字母与数字')),
                },
              ]}
            >
              <Input.Password placeholder="不填则使用系统默认密码" autoComplete="new-password" />
            </Form.Item>
          ) : null}
        </div>

        <Divider plain titlePlacement="start">
          基本信息
        </Divider>
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入真实姓名" />
          </Form.Item>
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              {
                validator: (_rule, value: string) =>
                  !value || isPhoneValid(value) ? Promise.resolve() : Promise.reject(new Error('请输入 11 位手机号')),
              },
            ]}
          >
            <Input placeholder="11 位手机号" maxLength={11} />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item label="部门" name="department">
            <Input placeholder="选填，如 采购部" />
          </Form.Item>
          <Form.Item label="用户类型" name="userType" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 'staff', label: '内部员工' },
                { value: 'supplier', label: '供应商账号' },
              ]}
            />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 1, label: '启用' },
                { value: 0, label: '停用' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="角色"
            name="roleCodes"
            rules={[{ required: true, message: '请至少选择一个角色' }]}
            className="md:col-span-2"
          >
            <Select
              mode="multiple"
              placeholder="请选择角色（可多选）"
              loading={!roleOptions}
              options={(roleOptions ?? []).map((role) => ({ value: role.code, label: role.name }))}
            />
          </Form.Item>
          <Form.Item label="备注" name="remark" className="md:col-span-2">
            <Input.TextArea rows={2} placeholder="选填" maxLength={200} showCount />
          </Form.Item>
        </div>

        {/* 提交按钮固定在抽屉底部，滚动长表单时始终可见。 */}
        <div className="sticky bottom-0 -mx-6 mt-4 border-t border-slate-100 bg-white px-6 py-4 text-right">
          <Button className="mr-2" onClick={onClose}>
            取消
          </Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {isEdit ? '保存' : '创建'}
          </Button>
        </div>
      </Form>
    </Drawer>
  )
}
