import { App, Button, Card, Form, Input } from 'antd'
import { useChangePassword } from '@/features/auth/hooks/useChangePassword'
import { isNewPasswordValid } from '@/features/auth/utils/validators'

interface ChangePasswordValues {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

/** 修改密码卡片：校验原密码必填 + 新密码强度 + 两次输入一致。 */
export function ChangePasswordForm() {
  const { message } = App.useApp()
  const changePassword = useChangePassword()
  const [form] = Form.useForm<ChangePasswordValues>()

  const handleSubmit = (values: ChangePasswordValues) => {
    changePassword.mutate(
      { oldPassword: values.oldPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          message.success('密码修改成功，下次登录请使用新密码')
          form.resetFields()
        },
        onError: (error) => message.error(error.message),
      },
    )
  }

  return (
    <Card title="修改密码">
      <Form<ChangePasswordValues> form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="原密码" name="oldPassword" rules={[{ required: true, message: '请输入原密码' }]}>
          <Input.Password placeholder="请输入当前密码" autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          label="新密码"
          name="newPassword"
          extra="8-20 位，且同时包含字母与数字"
          rules={[
            { required: true, message: '请输入新密码' },
            {
              validator: (_rule, value: string) =>
                value && !isNewPasswordValid(value)
                  ? Promise.reject(new Error('密码需 8-20 位且同时包含字母与数字'))
                  : Promise.resolve(),
            },
          ]}
        >
          <Input.Password placeholder="请输入新密码" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator: (_rule, value: string) =>
                !value || value === getFieldValue('newPassword')
                  ? Promise.resolve()
                  : Promise.reject(new Error('两次输入的密码不一致')),
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={changePassword.isPending}>
          修改密码
        </Button>
      </Form>
    </Card>
  )
}
