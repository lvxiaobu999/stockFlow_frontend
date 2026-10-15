import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input, Typography } from 'antd'
import { appEnv } from '@/config/env'
import { useLogin } from '@/features/auth/hooks/useLogin'
import type { LoginPayload } from '@/features/auth/types'

/**
 * 登录表单：账号 + 密码，提交走 useLogin mutation。
 *
 * 登录失败统一展示后端返回的 message（账号密码错误 / 账号停用 /
 * 供应商账号走门户），不在前端做账号格式预校验，避免和后端规则漂移。
 */
export function LoginForm() {
  const login = useLogin()
  const [form] = Form.useForm<LoginPayload>()

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      // 演示环境（.env.development 配置 VITE_DEMO_USERNAME/PASSWORD）预填账号，免输直接登录；
      // 生产构建 appEnv.demoLogin 恒为 null，不影响真实环境。
      initialValues={appEnv.demoLogin ?? undefined}
      onFinish={(values) => login.mutate(values)}
    >
      {login.isError ? (
        <Form.Item>
          <Alert type="error" showIcon message={login.error?.message ?? '登录失败，请稍后重试'} />
        </Form.Item>
      ) : null}
      <Form.Item label="账号" name="username" rules={[{ required: true, message: '请输入登录账号' }]}>
        <Input
          prefix={<UserOutlined className="login-input-icon" />}
          placeholder="请输入登录账号"
          autoComplete="username"
          autoFocus
          size="large"
        />
      </Form.Item>
      <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入登录密码' }]}>
        <Input.Password
          prefix={<LockOutlined className="login-input-icon" />}
          placeholder="请输入登录密码"
          autoComplete="current-password"
          size="large"
        />
      </Form.Item>
      <Form.Item className="login-submit-item">
        <Button type="primary" htmlType="submit" block size="large" loading={login.isPending}>
          登 录
        </Button>
      </Form.Item>
      <Typography.Text type="secondary" className="login-hint">
        忘记密码请联系系统管理员重置
      </Typography.Text>
    </Form>
  )
}
