import { Card, Col, Descriptions, Empty, Row, Space, Tag, Typography } from 'antd'
import { PageHeader } from '@/components/common/PageHeader'
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm'
import { ProfileBasicForm } from '@/features/auth/components/ProfileBasicForm'
import { roleTagColor } from '@/features/system/utils/roleTagColor'
import { useAuthStore } from '@/stores/authStore'
import { formatDateTime } from '@/utils'

/** 个人中心：基本资料、账号与安全（只读）与修改密码。当前用户来自登录会话 store。 */
export default function ProfilePage() {
  const currentUser = useAuthStore((state) => state.currentUser)

  // RequireAuth 保证进入该页时会话已恢复，currentUser 理论上不为空；
  // 兜底渲染空态，避免极端时序下的空指针。
  if (!currentUser) {
    return <Empty description="会话信息缺失，请重新登录" className="mt-24" />
  }

  return (
    <div className="dashboard-page">
      <PageHeader title="个人中心" description="维护个人基本资料与登录密码。" />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <ProfileBasicForm />
        </Col>
        <Col xs={24} lg={12}>
          <Space orientation="vertical" size={16} className="w-full">
            <Card title="账号与安全">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="用户类型">
                  {currentUser.userType === 'staff' ? '内部员工' : '供应商账号'}
                </Descriptions.Item>
                <Descriptions.Item label="拥有角色">
                  <Space size={4} wrap>
                    {currentUser.roleNames.length > 0 ? (
                      currentUser.roleNames.map((name, index) => (
                        <Tag key={name} color={roleTagColor(currentUser.roles[index] ?? name)}>
                          {name}
                        </Tag>
                      ))
                    ) : (
                      <Typography.Text type="secondary">未分配角色</Typography.Text>
                    )}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="最后登录">{formatDateTime(currentUser.lastLoginAt)}</Descriptions.Item>
                <Descriptions.Item label="最后登录 IP">
                  <Typography.Text type="secondary">{currentUser.lastLoginIp ?? '—'}</Typography.Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
            <ChangePasswordForm />
          </Space>
        </Col>
      </Row>
    </div>
  )
}
