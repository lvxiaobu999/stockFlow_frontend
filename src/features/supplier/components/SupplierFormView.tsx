import { useMemo } from 'react'
import { App, Button, Card, Col, Form, Input, Radio, Row } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/common/PageHeader'
import { useSupplierMutations } from '@/features/supplier/hooks/useSupplierMutations'
import { isSupplierPhoneValid, isTaxNoValid } from '@/features/supplier/utils/validators'
import type { SupplierRecord } from '@/features/supplier/types'

interface SupplierFormViewProps {
  /** 编辑目标；null 表示新建。 */
  supplier: SupplierRecord | null
  onCancel: () => void
  /** 保存成功后回调（页面切回列表）。 */
  onSaved: (record: SupplierRecord) => void
}

interface SupplierFormValues {
  name: string
  contactPerson: string
  phone: string
  email?: string
  address?: string
  bankName?: string
  bankAccount?: string
  taxNo?: string
  remark?: string
  status: 1 | 0
}

/**
 * 供应商新建 / 编辑视图：双卡片表单（基本信息 + 银行与开票信息）。
 *
 * - 名称、联系人、电话必填；税号选填但填了就必须是 18 位统一社会信用代码；
 * - 银行与开票信息在付款与对账环节引用，本期一并维护。
 */
export function SupplierFormView({ supplier, onCancel, onSaved }: SupplierFormViewProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<SupplierFormValues>()
  const { create, update } = useSupplierMutations()
  const isEdit = supplier !== null

  // 表单初值：编辑回显、新建默认（页面以 supplier.id / 'create' 为 key 重挂载，无 effect 回填）。
  const initialValues = useMemo(
    () =>
      supplier
        ? {
            name: supplier.name,
            contactPerson: supplier.contactPerson,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
            bankName: supplier.bankName,
            bankAccount: supplier.bankAccount,
            taxNo: supplier.taxNo,
            remark: supplier.remark,
            status: supplier.status,
          }
        : { status: 1 as const },
    [supplier],
  )

  const handleSubmit = (values: SupplierFormValues) => {
    const payload = {
      name: values.name.trim(),
      contactPerson: values.contactPerson.trim(),
      phone: values.phone.trim(),
      email: values.email?.trim(),
      address: values.address?.trim(),
      bankName: values.bankName?.trim(),
      bankAccount: values.bankAccount?.trim(),
      taxNo: values.taxNo?.trim(),
      remark: values.remark?.trim(),
      status: values.status,
    }
    const fail = (error: Error) => message.error(error.message)
    if (isEdit && supplier) {
      update.mutate(
        { id: supplier.id, payload },
        {
          onSuccess: (record) => {
            message.success(`供应商 ${record.name} 已更新`)
            onSaved(record)
          },
          onError: fail,
        },
      )
      return
    }
    create.mutate(payload, {
      onSuccess: (record) => {
        message.success(`供应商 ${record.name} 已创建（编码 ${record.code}）`)
        onSaved(record)
      },
      onError: fail,
    })
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title={isEdit ? `编辑供应商 · ${supplier?.name}` : '新建供应商'}
        description={isEdit ? `供应商编码 ${supplier?.code}，创建后不可修改` : '编码将由系统自动生成'}
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
      <Form<SupplierFormValues>
        form={form}
        layout="vertical"
        className="mt-4 max-w-3xl"
        initialValues={initialValues}
        onFinish={handleSubmit}
      >
        <Card size="small" title="基本信息">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="供应商名称"
                name="name"
                rules={[
                  { required: true, whitespace: true, message: '请输入供应商名称' },
                  { max: 100, message: '名称不超过 100 个字符' },
                ]}
              >
                <Input placeholder="公司全称，如 杭州宏远纸业有限公司" maxLength={100} autoComplete="off" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="联系人"
                name="contactPerson"
                rules={[{ required: true, whitespace: true, message: '请输入联系人' }]}
              >
                <Input placeholder="如 王建国" maxLength={30} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="联系电话"
                name="phone"
                rules={[
                  { required: true, whitespace: true, message: '请输入联系电话' },
                  {
                    validator: (_rule, value: string) =>
                      !value || isSupplierPhoneValid(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error('请输入 11 位手机号或区号-座机号')),
                  },
                ]}
              >
                <Input placeholder="如 138xxxx0000 或 0571-8765xxxx" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="邮箱" name="email" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
                <Input placeholder="选填" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="地址" name="address">
                <Input placeholder="选填" maxLength={200} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
        <Card size="small" title="银行与开票信息" className="mt-4">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="开户银行" name="bankName">
                <Input placeholder="选填" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="银行账号" name="bankAccount">
                <Input placeholder="选填" maxLength={32} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="纳税人识别号"
                name="taxNo"
                extra="18 位统一社会信用代码"
                rules={[
                  {
                    validator: (_rule, value: string) =>
                      !value || isTaxNoValid(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error('税号须为 18 位统一社会信用代码')),
                  },
                ]}
              >
                <Input placeholder="选填" maxLength={18} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="状态" name="status" rules={[{ required: true }]}>
                <Radio.Group
                  options={[
                    { value: 1, label: '启用' },
                    { value: 0, label: '停用' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="选填" maxLength={200} showCount />
          </Form.Item>
        </Card>
      </Form>
    </div>
  )
}
