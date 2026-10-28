import { useMemo } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from 'antd'
import { ArrowLeftOutlined, SendOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import type { FormListFieldData } from 'antd/es/form/FormList'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { useProductOptions } from '@/features/product/hooks/useProducts'
import { useSupplierOptions } from '@/features/supplier/hooks/useSuppliers'
import { usePurchaseOrderMutations } from '@/features/purchase/hooks/usePurchaseOrderMutations'
import { useNextPurchaseOrderCode } from '@/features/purchase/hooks/usePurchaseOrders'
import type { PurchaseOrderRecord, PurchaseRequestDetail } from '@/features/purchase/types'
import { isOrderEditable } from '@/features/purchase/utils/purchaseOrder'
import { calcItemAmount, calcTotalAmount } from '@/features/purchase/utils/purchaseRequest'
import { formatMoney } from '@/utils'

interface PurchaseOrderFormViewProps {
  /** 编辑目标（草稿）；null 表示新建。 */
  order: PurchaseOrderRecord | null
  /**
   * 来源申请（仅「从申请生成」的新建场景传入）：明细与期望交货日期从申请带入。
   * 编辑与线下补录场景为 null。
   */
  sourceRequest?: PurchaseRequestDetail | null
  onCancel: () => void
  /** 保存 / 保存并发送成功后回调（页面切回列表）。 */
  onSaved: (record: PurchaseOrderRecord) => void
}

/** 表单明细行值（与提交载荷同构；商品档案字段由服务端快照）。 */
interface ItemFormValue {
  productId: string
  quantity: number
  unitPrice: number
  remark?: string
}

interface OrderFormValues {
  supplierId: string
  expectedDate?: dayjs.Dayjs | null
  remark?: string
  items: ItemFormValue[]
}

/**
 * 采购订单新建 / 编辑视图：订单信息卡片 + 明细行可编辑表格。
 *
 * - 编号服务端生成（新建时预览、编辑只读），采购员固定为当前登录用户；
 * - 「从申请生成」时明细按申请带入（成交单价默认取申请参考价），可调整数量与单价；
 *   线下补录（无来源申请）从空明细开始，商品选定后带出采购参考价；
 * - 「存为草稿」仅保存；「存为草稿并发送」保存后调用发送动作（两步分开调用，
 *   保证服务端状态机与申请侧联动完整）；发送后进入待供应商确认。
 */
export function PurchaseOrderFormView({ order, sourceRequest, onCancel, onSaved }: PurchaseOrderFormViewProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<OrderFormValues>()
  const { create, update, send } = usePurchaseOrderMutations()
  const { has } = usePermissions()
  const { data: productOptions } = useProductOptions()
  const { data: supplierOptions } = useSupplierOptions()
  const isEdit = order !== null
  const canSend = has('purchase:order:send')
  // 入口按状态收敛（列表 / 详情只放出草稿），这里兜底防 URL 直达。
  const editable = !isEdit || isOrderEditable(order.status)

  const nextCode = useNextPurchaseOrderCode(!isEdit)
  const productById = useMemo(() => new Map(productOptions.map((item) => [item.id, item])), [productOptions])

  // 表单初值：编辑回显订单；从申请生成时带入明细；线下补录为空明细。
  const initialValues = useMemo<OrderFormValues>(
    () =>
      order
        ? {
            supplierId: order.supplierId,
            expectedDate: order.expectedDate ? dayjs(order.expectedDate) : null,
            remark: order.remark,
            items: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              remark: item.remark,
            })),
          }
        : {
            supplierId: '',
            expectedDate: sourceRequest?.expectedDate ? dayjs(sourceRequest.expectedDate) : null,
            remark: undefined,
            items:
              sourceRequest?.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.referencePrice,
                remark: item.remark,
              })) ?? [],
          },
    [order, sourceRequest],
  )

  // 明细的实时值：单位、行金额与合计的渲染来源（跟随表单值，不复制进 state）。
  const watchedItems = (Form.useWatch('items', form) ?? []) as ItemFormValue[]

  /** 整体改写明细行：行增删的统一入口。 */
  const setItems = (items: ItemFormValue[]) => form.setFieldValue('items', items)

  /** 追加空明细行；允许重复入口（保存时由校验兜底）。 */
  const addRow = () => {
    setItems([...watchedItems, { productId: '', quantity: 1, unitPrice: 0 }])
  }

  /** 删除明细行；允许删空（保存时由校验兜底）。 */
  const removeRow = (index: number) => {
    setItems(watchedItems.filter((_, itemIndex) => itemIndex !== index))
  }

  /** 保存（草稿）；saveAndSend 时保存成功后接着调用发送动作。 */
  const handleSave = async (saveAndSend: boolean) => {
    const values = await form.validateFields()
    // requestId 仅新建且从申请生成时携带；编辑不换源（服务端同样忽略）。
    const basePayload = {
      supplierId: values.supplierId,
      expectedDate: values.expectedDate ? values.expectedDate.format('YYYY-MM-DD') : undefined,
      remark: values.remark?.trim() || undefined,
      items: values.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        remark: item.remark?.trim() || undefined,
      })),
    }
    try {
      const saved =
        isEdit && order
          ? await update.mutateAsync({ id: order.id, payload: basePayload })
          : await create.mutateAsync({ ...basePayload, requestId: sourceRequest?.id })
      const finalRecord = saveAndSend && canSend ? await send.mutateAsync(saved.id) : saved
      message.success(
        saveAndSend && canSend
          ? `采购订单 ${finalRecord.code} 已发送供应商确认`
          : `草稿已保存（编号 ${finalRecord.code}）`,
      )
      onSaved(finalRecord)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败，请重试')
    }
  }

  const saving = create.isPending || update.isPending
  const submitting = saving || send.isPending

  // ── 明细表格列（Form.List 渲染，field.name 即行下标）────────────────
  const itemColumns: ColumnsType<FormListFieldData> = [
    { title: '#', width: 48, align: 'center', render: (_, __, index) => index + 1 },
    {
      title: '商品',
      width: 320,
      render: (_, field) => (
        <Form.Item
          name={[field.name, 'productId']}
          noStyle
          rules={[
            { required: true, message: '请选择商品' },
            {
              validator: (_rule, value: string) => {
                const duplicated = watchedItems.some(
                  (item, index) => index !== field.name && item.productId && item.productId === value,
                )
                return duplicated ? Promise.reject(new Error('该商品已在明细中')) : Promise.resolve()
              },
            },
          ]}
        >
          <Select
            showSearch
            placeholder="搜索商品编码 / 名称"
            optionFilterProp="label"
            options={productOptions.map((product) => ({
              value: product.id,
              label: `${product.code} ${product.name}`,
            }))}
            onChange={(value) => {
              // 选定商品后带出采购参考价默认值（成交价可改，切换商品时覆盖为新默认值）。
              const product = productById.get(value)
              if (product) form.setFieldValue(['items', field.name, 'unitPrice'], product.purchasePrice)
            }}
            style={{ width: '100%' }}
          />
        </Form.Item>
      ),
    },
    {
      title: '单位',
      width: 70,
      render: (_, field) => {
        const product = watchedItems[field.name]?.productId
          ? productById.get(watchedItems[field.name].productId)
          : undefined
        return product ? <span>{product.unit}</span> : <Typography.Text type="secondary">—</Typography.Text>
      },
    },
    {
      title: '数量',
      width: 110,
      render: (_, field) => (
        <Form.Item
          name={[field.name, 'quantity']}
          noStyle
          rules={[
            { required: true, message: '请输入数量' },
            { type: 'integer', min: 1, max: 99999, message: '数量须为 1-99999 的整数' },
          ]}
        >
          <InputNumber min={1} max={99999} precision={0} style={{ width: '100%' }} />
        </Form.Item>
      ),
    },
    {
      title: '成交单价',
      width: 130,
      render: (_, field) => (
        <Form.Item
          name={[field.name, 'unitPrice']}
          noStyle
          rules={[
            { required: true, message: '请输入成交单价' },
            { type: 'number', min: 0, max: 9999999, message: '单价须为不小于 0 的数字' },
          ]}
        >
          <InputNumber min={0} max={9999999} precision={2} style={{ width: '100%' }} />
        </Form.Item>
      ),
    },
    {
      title: '金额',
      width: 110,
      align: 'right',
      render: (_, field) => {
        const row = watchedItems[field.name]
        if (!row || row.quantity === undefined || row.unitPrice === undefined) return '—'
        return <span className="font-medium">¥{formatMoney(calcItemAmount(row.quantity, row.unitPrice))}</span>
      },
    },
    {
      title: '备注',
      render: (_, field) => (
        <Form.Item name={[field.name, 'remark']} noStyle>
          <Input placeholder="选填" maxLength={100} />
        </Form.Item>
      ),
    },
    {
      title: '操作',
      width: 64,
      render: (_, field) => (
        <Button type="link" size="small" danger onClick={() => removeRow(field.name)}>
          删除
        </Button>
      ),
    },
  ]

  return (
    <div className="dashboard-page">
      <PageHeader
        title={isEdit ? `编辑采购订单 · ${order?.code}` : sourceRequest ? '从申请生成采购订单' : '新建采购订单'}
        description={
          isEdit
            ? '草稿可继续编辑明细与供应商，发送后进入待供应商确认'
            : sourceRequest
              ? '明细已从申请带入，确认供应商与成交单价后发送'
              : '线下订单补录：未关联采购申请，保存草稿后可发送供应商'
        }
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={onCancel}>
              返回
            </Button>
            <Button disabled={!editable} loading={saving} onClick={() => void handleSave(false)}>
              存为草稿
            </Button>
            {canSend ? (
              <Button
                disabled={!editable}
                type="primary"
                icon={<SendOutlined />}
                loading={submitting}
                onClick={() => void handleSave(true)}
              >
                存为草稿并发送
              </Button>
            ) : null}
          </Space>
        }
      />
      {isEdit && !editable ? (
        <Alert
          className="mt-4"
          type="info"
          showIcon
          message="该订单当前状态不允许编辑，仅可查看"
          action={
            <Button size="small" onClick={onCancel}>
              返回列表
            </Button>
          }
        />
      ) : null}
      <Form<OrderFormValues>
        form={form}
        layout="vertical"
        className="mt-4"
        initialValues={initialValues}
        onFinish={() => void handleSave(true)}
      >
        <Card size="small" title="订单信息">
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="订单编号">
                <Input
                  disabled
                  value={isEdit ? order?.code : (nextCode.code ?? '')}
                  placeholder={nextCode.isLoading ? '生成中…' : '保存后自动生成'}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="供应商"
                name="supplierId"
                rules={[{ required: true, message: '请选择供应商' }]}
                extra="仅启用供应商可选；停用供应商的历史订单不受影响"
              >
                <Select
                  placeholder="搜索供应商名称"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={(supplierOptions ?? []).map((supplier) => ({
                    value: supplier.id,
                    label: `${supplier.name} · ${supplier.contactPerson}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="期望交货日期" name="expectedDate">
                <DatePicker
                  style={{ width: '100%' }}
                  // 交货日期不允许早于今天。
                  disabledDate={(current) => current.isBefore(dayjs().startOf('day'), 'day')}
                />
              </Form.Item>
            </Col>
          </Row>
          {sourceRequest ? (
            <Row gutter={24}>
              <Col span={24}>
                <Form.Item label="来源申请">
                  <Input
                    disabled
                    value={`${sourceRequest.code} · ${sourceRequest.title}（预计金额 ¥${formatMoney(sourceRequest.totalAmount)}）`}
                  />
                </Form.Item>
              </Col>
            </Row>
          ) : null}
          <Row gutter={24}>
            <Col span={24}>
              <Form.Item label="备注" name="remark" rules={[{ max: 500, message: '备注不超过 500 个字符' }]}>
                <Input.TextArea rows={2} placeholder="交货要求、包装要求等（选填）" maxLength={500} showCount />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          size="small"
          title="订单明细"
          className="mt-4"
          extra={
            <Button type="primary" ghost onClick={addRow} disabled={!editable}>
              添加明细行
            </Button>
          }
        >
          <Form.List
            name="items"
            rules={[
              {
                // Form.List 的规则仅支持 validator 形态，空明细在这里兜底报错。
                validator: async (_rule, value: ItemFormValue[] | undefined) => {
                  if (!value || value.length === 0) throw new Error('请至少添加一条订单明细')
                },
              },
            ]}
          >
            {(fields) => {
              const rows: Array<FormListFieldData & Partial<ItemFormValue>> = fields.map((field) => ({
                ...field,
                ...(watchedItems[field.name] ?? {}),
              }))
              const total = calcTotalAmount(
                watchedItems
                  .filter((item) => item.quantity !== undefined && item.unitPrice !== undefined)
                  .map((item) => ({ quantity: item.quantity, referencePrice: item.unitPrice })),
              )
              return (
                <Table<FormListFieldData & Partial<ItemFormValue>>
                  dataSource={rows}
                  rowKey="key"
                  columns={itemColumns}
                  pagination={false}
                  scroll={{ x: 960 }}
                  locale={{ emptyText: '暂无明细，点击右上角「添加明细行」开始' }}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4}>
                        <Typography.Text strong>订单总金额（{fields.length} 项）</Typography.Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right">
                        <Typography.Text strong>¥{formatMoney(total)}</Typography.Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} colSpan={2}>
                        <span> </span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              )
            }}
          </Form.List>
          <Form.ErrorList />
        </Card>
      </Form>
    </div>
  )
}
