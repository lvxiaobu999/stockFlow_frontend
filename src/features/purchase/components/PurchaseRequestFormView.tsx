import { useMemo, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popover,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from 'antd'
import { ArrowLeftOutlined, WarningOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import type { FormListFieldData } from 'antd/es/form/FormList'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuthStore } from '@/stores/authStore'
import { useProductOptions } from '@/features/product/hooks/useProducts'
import { useNextPurchaseRequestCode } from '@/features/purchase/hooks/usePurchaseRequests'
import { usePurchaseRequestMutations } from '@/features/purchase/hooks/usePurchaseRequestMutations'
import type { PurchaseRequestRecord } from '@/features/purchase/types'
import { calcItemAmount, calcTotalAmount, isRequestEditable } from '@/features/purchase/utils/purchaseRequest'
import { formatMoney } from '@/utils'

interface PurchaseRequestFormViewProps {
  /** 编辑目标（草稿或已拒绝）；null 表示新建。 */
  request: PurchaseRequestRecord | null
  onCancel: () => void
  /** 保存 / 提交成功后回调（页面切回列表）。 */
  onSaved: (record: PurchaseRequestRecord) => void
}

/** 表单明细行值（与提交载荷同构；商品档案字段由服务端快照）。 */
interface ItemFormValue {
  productId: string
  quantity: number
  referencePrice: number
  remark?: string
}

interface RequestFormValues {
  title: string
  expectedDate?: dayjs.Dayjs | null
  reason: string
  items: ItemFormValue[]
}

/**
 * 采购申请新建 / 编辑视图：申请信息卡片 + 明细行可编辑表格。
 *
 * - 编号服务端生成（新建时预览、编辑只读），申请人固定为当前登录用户；
 * - 明细行选商品后自动带出采购参考价默认值；「从预警商品带入」一键追加
 *   低于安全库存的商品（预警口径 totalStock < safetyStock，前端过滤）；
 * - 「存为草稿」仅保存；「提交审批」保存后调用提交动作（草稿提交 / 被拒重提），
 *   两步动作分开调用以保证服务端状态机与审批流水完整；
 * - 行的增删直接改写 items 表单值（Form.List 会随值重渲染），不经 operation 句柄。
 */
export function PurchaseRequestFormView({ request, onCancel, onSaved }: PurchaseRequestFormViewProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<RequestFormValues>()
  const { create, update, submit } = usePurchaseRequestMutations()
  const currentUser = useAuthStore((state) => state.currentUser)
  const { data: productOptions } = useProductOptions()
  const isEdit = request !== null
  // 入口按状态收敛（列表 / 详情只放出可编辑状态），这里兜底防 URL 直达。
  const editable = !isEdit || isRequestEditable(request.status)

  const nextCode = useNextPurchaseRequestCode(!isEdit)
  const [warningPickerOpen, setWarningPickerOpen] = useState(false)
  const [pickedWarningIds, setPickedWarningIds] = useState<string[]>([])

  const productById = useMemo(() => new Map(productOptions.map((item) => [item.id, item])), [productOptions])
  const warningOptions = useMemo(
    () => productOptions.filter((item) => item.totalStock < item.safetyStock),
    [productOptions],
  )

  // 表单初值：编辑回显、新建空明细（页面以 request?.id / 'create' 为 key 重挂载，无 effect 回填）。
  const initialValues = useMemo<RequestFormValues>(
    () =>
      request
        ? {
            title: request.title,
            expectedDate: request.expectedDate ? dayjs(request.expectedDate) : null,
            reason: request.reason,
            items: request.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              referencePrice: item.referencePrice,
              remark: item.remark,
            })),
          }
        : { title: '', reason: '', items: [] },
    [request],
  )

  // 明细的实时值：单位、行金额与合计的渲染来源（跟随表单值，不复制进 state）。
  const watchedItems = (Form.useWatch('items', form) ?? []) as ItemFormValue[]

  /** 整体改写明细行：行增删与预警带入的统一入口。 */
  const setItems = (items: ItemFormValue[]) => form.setFieldValue('items', items)

  /** 追加明细行；给出商品时带入参考价默认值（已存在的商品跳过）。 */
  const addRows = (products?: Array<{ id: string; purchasePrice: number }>) => {
    const existing = new Set(watchedItems.map((item) => item.productId))
    const additions = (products ?? [null]).map((product) =>
      product
        ? { productId: product.id, quantity: 1, referencePrice: product.purchasePrice }
        : { productId: '', quantity: 1, referencePrice: 0 },
    )
    const fresh = additions.filter((row) => !row.productId || !existing.has(row.productId))
    if (fresh.length === 0) {
      message.info('所选预警商品都已在明细中')
      return
    }
    setItems([...watchedItems, ...fresh])
  }

  /** 删除明细行；允许删空（保存 / 提交时由校验兜底）。 */
  const removeRow = (index: number) => {
    setItems(watchedItems.filter((_, itemIndex) => itemIndex !== index))
  }

  /** 保存（草稿）或保存后提交审批；两步动作串行调用保证状态机完整。 */
  const handleSave = async (thenSubmit: boolean) => {
    const values = await form.validateFields()
    const payload = {
      title: values.title.trim(),
      expectedDate: values.expectedDate ? values.expectedDate.format('YYYY-MM-DD') : undefined,
      reason: values.reason.trim(),
      items: values.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        referencePrice: item.referencePrice,
        remark: item.remark?.trim() || undefined,
      })),
    }
    try {
      const saved =
        isEdit && request ? await update.mutateAsync({ id: request.id, payload }) : await create.mutateAsync(payload)
      const finalRecord = thenSubmit ? await submit.mutateAsync(saved.id) : saved
      message.success(thenSubmit ? `采购申请 ${finalRecord.code} 已提交审批` : `草稿已保存（编号 ${finalRecord.code}）`)
      onSaved(finalRecord)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败，请重试')
    }
  }

  const saving = create.isPending || update.isPending
  const submitting = saving || submit.isPending

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
              // 选定商品后带出参考价默认值（单价可改，切换商品时覆盖为新的默认值）。
              const product = productById.get(value)
              if (product) form.setFieldValue(['items', field.name, 'referencePrice'], product.purchasePrice)
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
      title: '参考单价',
      width: 130,
      render: (_, field) => (
        <Form.Item
          name={[field.name, 'referencePrice']}
          noStyle
          rules={[
            { required: true, message: '请输入参考单价' },
            { type: 'number', min: 0, max: 9999999, message: '单价须为不小于 0 的数字' },
          ]}
        >
          <InputNumber min={0} max={9999999} precision={2} style={{ width: '100%' }} />
        </Form.Item>
      ),
    },
    {
      title: '预计金额',
      width: 110,
      align: 'right',
      render: (_, field) => {
        const row = watchedItems[field.name]
        if (!row || row.quantity === undefined || row.referencePrice === undefined) return '—'
        return <span className="font-medium">¥{formatMoney(calcItemAmount(row.quantity, row.referencePrice))}</span>
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

  const warningPicker = (
    <div className="w-85">
      <Checkbox.Group
        className="flex max-h-60 flex-col gap-2 overflow-auto"
        value={pickedWarningIds}
        onChange={(values) => setPickedWarningIds(values as string[])}
        options={warningOptions.map((product) => ({
          value: product.id,
          label: `${product.name}（库存 ${product.totalStock} / 安全库存 ${product.safetyStock}）`,
        }))}
      />
      {warningOptions.length === 0 ? (
        <Typography.Text type="secondary">当前没有低于安全库存的商品</Typography.Text>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <Button
          size="small"
          onClick={() => {
            setPickedWarningIds([])
            setWarningPickerOpen(false)
          }}
        >
          取消
        </Button>
        <Button
          size="small"
          type="primary"
          onClick={() => {
            addRows(warningOptions.filter((product) => pickedWarningIds.includes(product.id)))
            setPickedWarningIds([])
            setWarningPickerOpen(false)
          }}
        >
          带入
        </Button>
      </div>
    </div>
  )

  return (
    <div className="dashboard-page">
      <PageHeader
        title={isEdit ? `编辑采购申请 · ${request?.code}` : '新建采购申请'}
        description={
          isEdit ? '已拒绝的申请完善明细后可重新提交审批，草稿可继续编辑' : '保存草稿可稍后继续编辑，提交后进入审批流程'
        }
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={onCancel}>
              返回
            </Button>
            <Button disabled={!editable} loading={saving} onClick={() => void handleSave(false)}>
              存为草稿
            </Button>
            <Button disabled={!editable} type="primary" loading={submitting} onClick={() => void handleSave(true)}>
              提交审批
            </Button>
          </Space>
        }
      />
      {isEdit && request?.status === 'rejected' && editable ? (
        <Alert className="mt-4" type="warning" showIcon message="该申请已被拒绝，完善内容后可重新提交审批" />
      ) : null}
      {!editable ? (
        <Alert
          className="mt-4"
          type="info"
          showIcon
          message="该申请当前状态不允许编辑，仅可查看"
          action={
            <Button size="small" onClick={onCancel}>
              返回列表
            </Button>
          }
        />
      ) : null}
      <Form<RequestFormValues>
        form={form}
        layout="vertical"
        className="mt-4"
        initialValues={initialValues}
        onFinish={() => void handleSave(true)}
      >
        <Card size="small" title="申请信息">
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="申请编号">
                <Input
                  disabled
                  value={isEdit ? request?.code : (nextCode.code ?? '')}
                  placeholder={nextCode.isLoading ? '生成中…' : '提交后自动生成'}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="申请主题"
                name="title"
                rules={[
                  { required: true, whitespace: true, message: '请输入申请主题' },
                  { max: 100, message: '主题不超过 100 个字符' },
                ]}
              >
                <Input placeholder="如：Q4 办公耗材集中采购" maxLength={100} autoComplete="off" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="申请人">
                <Input
                  disabled
                  value={currentUser ? `${currentUser.name} · ${currentUser.department ?? ''}` : ''}
                  placeholder="当前登录用户"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="期望到货日期" name="expectedDate">
                <DatePicker
                  style={{ width: '100%' }}
                  // 到货日期不允许早于今天。
                  disabledDate={(current) => current.isBefore(dayjs().startOf('day'), 'day')}
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                label="采购原因"
                name="reason"
                rules={[
                  { required: true, whitespace: true, message: '请说明采购背景与用途' },
                  { max: 500, message: '原因不超过 500 个字符' },
                ]}
                extra="审批人可见"
              >
                <Input.TextArea rows={2} placeholder="请说明采购背景与用途" maxLength={500} showCount />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          size="small"
          title="申请明细"
          className="mt-4"
          extra={
            <Space>
              <Popover
                open={warningPickerOpen}
                onOpenChange={setWarningPickerOpen}
                trigger="click"
                placement="bottomRight"
                content={warningPicker}
              >
                <Button icon={<WarningOutlined />}>从预警商品带入</Button>
              </Popover>
              <Button type="primary" ghost onClick={() => addRows()}>
                添加明细行
              </Button>
            </Space>
          }
        >
          <Form.List
            name="items"
            rules={[
              {
                // Form.List 的规则仅支持 validator 形态，空明细在这里兜底报错。
                validator: async (_rule, value: ItemFormValue[] | undefined) => {
                  if (!value || value.length === 0) throw new Error('请至少添加一条申请明细')
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
                  .filter((item) => item.quantity !== undefined && item.referencePrice !== undefined)
                  .map((item) => ({ quantity: item.quantity, referencePrice: item.referencePrice })),
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
                        <Typography.Text strong>预计总金额（{fields.length} 项）</Typography.Text>
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
