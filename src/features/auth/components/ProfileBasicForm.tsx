import { useEffect } from 'react'
import { App, Button, Card, Descriptions, Form, Input } from 'antd'
import { useUpdateProfile } from '@/features/auth/hooks/useUpdateProfile'
import { isPhoneValid } from '@/features/system/utils/validators'
import { useAuthStore } from '@/stores/authStore'

interface ProfileFormValues {
  name: string
  phone: string
  email?: string
}

/**
 * 基本资料卡片：账号 / 部门等不可变信息只读展示，姓名 / 手机号 / 邮箱可编辑。
 * 提交成功后 authStore 同步更新，顶栏姓名立即变化（见 useUpdateProfile）。
 */
export function ProfileBasicForm() {
  const { message } = App.useApp()
  const currentUser = useAuthStore((state) => state.currentUser)
  const updateProfile = useUpdateProfile()
  const [form] = Form.useForm<ProfileFormValues>()

  // 回显当前资料；currentUser 变化（如保存成功）后同步刷新表单。
  useEffect(() => {
    if (!currentUser) return
    form.setFieldsValue({
      name: currentUser.name,
      phone: currentUser.phone,
      email: currentUser.email,
    })
  }, [currentUser, form])

  const handleSubmit = (values: ProfileFormValues) => {
    updateProfile.mutate(values, {
      onSuccess: () => message.success('基本资料已更新'),
      onError: (error) => message.error(error.message),
    })
  }

  return (
    <Card title="基本资料">
      <Descriptions column={1} size="small" className="mb-6">
        <Descriptions.Item label="登录账号">{currentUser?.username ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="所属部门">{currentUser?.department ?? '—'}</Descriptions.Item>
      </Descriptions>
      <Form<ProfileFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="请输入姓名" />
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
        <Button type="primary" htmlType="submit" loading={updateProfile.isPending}>
          保存修改
        </Button>
      </Form>
    </Card>
  )
}
