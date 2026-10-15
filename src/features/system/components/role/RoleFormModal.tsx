import { useEffect } from 'react'
import { App, Form, Input, Modal } from 'antd'
import { useRoleMutations } from '@/features/system/hooks/useRoleMutations'
import type { RoleRecord } from '@/features/system/types'

interface RoleFormModalProps {
  open: boolean
  /** 编辑目标；null 表示新建。 */
  role: RoleRecord | null
  onClose: () => void
}

interface RoleFormValues {
  code: string
  name: string
  description?: string
}

/**
 * 角色新建 / 编辑弹窗。
 *
 * 编码仅字母数字且创建后不可修改（编码被按钮权限码、角色下拉等引用，
 * 改码会导致权限映射失效），编辑时禁用该字段。
 */
export function RoleFormModal({ open, role, onClose }: RoleFormModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<RoleFormValues>()
  const { create, update } = useRoleMutations()
  const isEdit = role !== null

  useEffect(() => {
    if (!open) return
    if (role) {
      form.setFieldsValue({ code: role.code, name: role.name, description: role.description })
    } else {
      form.resetFields()
    }
  }, [open, role, form])

  const handleSubmit = (values: RoleFormValues) => {
    const fail = (error: Error) => message.error(error.message)
    if (isEdit && role) {
      update.mutate(
        { id: role.id, payload: { name: values.name, description: values.description } },
        {
          onSuccess: () => {
            message.success(`角色 ${values.name} 已更新`)
            onClose()
          },
          onError: fail,
        },
      )
      return
    }
    create.mutate(values, {
      onSuccess: () => {
        message.success(`角色 ${values.name} 已创建，请在列表中配置权限`)
        onClose()
      },
      onError: fail,
    })
  }

  return (
    <Modal
      title={isEdit ? `编辑角色 · ${role?.name}` : '新建角色'}
      open={open}
      onCancel={onClose}
      okText={isEdit ? '保存' : '创建'}
      cancelText="取消"
      confirmLoading={create.isPending || update.isPending}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form<RoleFormValues> form={form} layout="vertical" className="mt-4" onFinish={handleSubmit}>
        <Form.Item
          label="角色编码"
          name="code"
          extra="仅字母与数字，创建后不可修改；新角色初始无任何权限"
          rules={[
            { required: !isEdit, message: '请输入角色编码' },
            { pattern: /^[A-Za-z0-9_]+$/, message: '仅支持字母、数字与下划线' },
          ]}
        >
          <Input placeholder="如 inspector" disabled={isEdit} autoComplete="off" />
        </Form.Item>
        <Form.Item label="角色名称" name="name" rules={[{ required: true, message: '请输入角色名称' }]}>
          <Input placeholder="如 验收员" />
        </Form.Item>
        <Form.Item label="描述" name="description">
          <Input.TextArea rows={3} placeholder="选填，说明该角色的职责范围" maxLength={200} showCount />
        </Form.Item>
      </Form>
    </Modal>
  )
}
