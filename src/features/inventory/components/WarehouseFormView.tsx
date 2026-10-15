import { useMemo } from 'react'
import { App, Button, Card, Col, Form, Input, Radio, Row, Select } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/common/PageHeader'
import { useStaffOptions } from '@/features/system/hooks/useUsers'
import type { StaffOption } from '@/features/system/types'
import { useWarehouseMutations } from '@/features/inventory/hooks/useWarehouseMutations'
import type { WarehouseRecord } from '@/features/inventory/types'

interface WarehouseFormViewProps {
  /** 编辑目标；null 表示新建。 */
  warehouse: WarehouseRecord | null
  onCancel: () => void
  /** 保存成功后回调（页面切回列表）。 */
  onSaved: (record: WarehouseRecord) => void
}

interface WarehouseFormValues {
  name: string
  ownerUserId?: string
  phone?: string
  address?: string
  remark?: string
  status: 1 | 0
}

/**
 * 仓库新建 / 编辑视图。
 *
 * 负责人下拉为「系统用户」中启用的内部员工（/system/user/staff-options）；
 * 编码服务端生成（WH + 3 位流水）、创建后不可修改。
 */
export function WarehouseFormView({ warehouse, onCancel, onSaved }: WarehouseFormViewProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<WarehouseFormValues>()
  const { create, update } = useWarehouseMutations()
  const { data: staffOptions } = useStaffOptions()
  const isEdit = warehouse !== null

  // 表单初值：编辑回显、新建默认（页面以 warehouse.id / 'create' 为 key 重挂载）。
  const initialValues = useMemo(
    () =>
      warehouse
        ? {
            name: warehouse.name,
            ownerUserId: warehouse.ownerUserId,
            phone: warehouse.phone,
            address: warehouse.address,
            remark: warehouse.remark,
            status: warehouse.status,
          }
        : { status: 1 as const },
    [warehouse],
  )

  const handleSubmit = (values: WarehouseFormValues) => {
    const payload = {
      name: values.name.trim(),
      ownerUserId: values.ownerUserId,
      phone: values.phone?.trim(),
      address: values.address?.trim(),
      remark: values.remark?.trim(),
      status: values.status,
    }
    const fail = (error: Error) => message.error(error.message)
    if (isEdit && warehouse) {
      update.mutate(
        { id: warehouse.id, payload },
        {
          onSuccess: (record) => {
            message.success(`仓库 ${record.name} 已更新`)
            onSaved(record)
          },
          onError: fail,
        },
      )
      return
    }
    create.mutate(payload, {
      onSuccess: (record) => {
        message.success(`仓库 ${record.name} 已创建（编码 ${record.code}）`)
        onSaved(record)
      },
      onError: fail,
    })
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title={isEdit ? `编辑仓库 · ${warehouse?.name}` : '新建仓库'}
        description={isEdit ? `仓库编码 ${warehouse?.code}，创建后不可修改` : '编码将由系统自动生成'}
        extra={
          <>
            <Button icon={<ArrowLeftOutlined />} onClick={onCancel}>
              返回
            </Button>
            <Button type="primary" loading={create.isPending || update.isPending} onClick={() => form.submit()}>
              保存
            </Button>
          </>
        }
      />
      <Card size="small" className="mt-4">
        <Form<WarehouseFormValues>
          form={form}
          layout="vertical"
          className="max-w-3xl"
          initialValues={initialValues}
          onFinish={handleSubmit}
        >
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="仓库编码">
                <Input disabled placeholder="保存后由系统生成" value={isEdit ? warehouse?.code : undefined} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="仓库名称"
                name="name"
                rules={[
                  { required: true, whitespace: true, message: '请输入仓库名称' },
                  { max: 50, message: '仓库名称不超过 50 个字符' },
                ]}
              >
                <Input placeholder="如 上海仓" maxLength={50} autoComplete="off" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="负责人" name="ownerUserId" extra="仅系统用户中的启用员工可选">
                <Select
                  placeholder="选填，待分配"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={(staffOptions ?? []).map((staff: StaffOption) => ({
                    value: staff.id,
                    label: staff.department ? `${staff.name}（${staff.department}）` : staff.name,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="联系电话" name="phone">
                <Input placeholder="选填" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label="仓库地址" name="address">
                <Input placeholder="选填" maxLength={200} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="状态" name="status" rules={[{ required: true }]}>
                <Radio.Group
                  options={[
                    { value: 1, label: '启用' },
                    { value: 0, label: '停用' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label="备注" name="remark">
                <Input.TextArea rows={3} placeholder="选填" maxLength={200} showCount />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  )
}
