import { App, Form, Input, InputNumber, Modal, Select } from 'antd'
import { useEffect } from 'react'
import { useProductOptions } from '@/features/product/hooks/useProducts'
import { useStockAdjust } from '@/features/inventory/hooks/useStockMutations'
import { useWarehouseOptions } from '@/features/inventory/hooks/useWarehouses'

interface StockAdjustModalProps {
  open: boolean
  /** 行内发起时预填仓库 + 商品；工具栏发起为空（两项都可自选）。 */
  initialValues?: { warehouseId?: string; productId?: string }
  onClose: () => void
}

interface AdjustFormValues {
  warehouseId: string
  productId: string
  changeQty: number
  remark?: string
}

/**
 * 库存调整弹窗：期初录入与纠错同一入口。
 *
 * 调整数量为带符号整数（+ 入 − 出）；服务端校验「调整后库存非负」，
 * 调整成功后写调整流水并同步刷新库存 / 仓库 / 商品三侧投影。
 */
export function StockAdjustModal({ open, initialValues, onClose }: StockAdjustModalProps) {
  const [form] = Form.useForm<AdjustFormValues>()
  const { message } = App.useApp()
  const { data: warehouseOptions } = useWarehouseOptions()
  const { data: products } = useProductOptions()
  const { mutateAsync: adjustStock, isPending } = useStockAdjust()

  // 商品选项展示「名称（编码）」，与采购单据选品口径一致。
  const productOptions = products.map((product) => ({ label: `${product.name}（${product.code}）`, value: product.id }))

  // 弹窗每次打开时回填预置值（行内发起：仓库 + 商品锁定语境，仍可修改）。
  useEffect(() => {
    if (open) form.setFieldsValue({ warehouseId: initialValues?.warehouseId, productId: initialValues?.productId })
  }, [open, initialValues, form])

  const handleSubmit = async (values: AdjustFormValues) => {
    const product = productOptions.find((item) => item.value === values.productId)
    const warehouse = warehouseOptions.find((item) => item.value === values.warehouseId)
    try {
      await adjustStock({
        warehouseId: values.warehouseId,
        productId: values.productId,
        changeQty: values.changeQty,
        remark: values.remark?.trim() || undefined,
      })
      message.success(
        `库存已调整：${product?.label ?? values.productId} @ ${warehouse?.label ?? values.warehouseId} ${
          values.changeQty > 0 ? '+' : ''
        }${values.changeQty}`,
      )
      form.resetFields()
      onClose()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  return (
    <Modal
      title="库存调整"
      open={open}
      confirmLoading={isPending}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void form.submit()}
      okText="确认调整"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={(values) => void handleSubmit(values)} className="mt-4">
        <Form.Item name="warehouseId" label="仓库" rules={[{ required: true, message: '请选择仓库' }]}>
          <Select placeholder="请选择仓库" options={warehouseOptions} showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item name="productId" label="商品" rules={[{ required: true, message: '请选择商品' }]}>
          <Select
            placeholder="请选择商品"
            options={productOptions}
            showSearch
            optionFilterProp="label"
            // 停用商品不可再入库，调整下拉仅启用商品（偏差记录见 docs）。
          />
        </Form.Item>
        <Form.Item
          name="changeQty"
          label="调整数量（+ 入 − 出）"
          rules={[
            { required: true, message: '请填写调整数量' },
            {
              validator: (_, value?: number) =>
                value === undefined || Number.isInteger(value)
                  ? Promise.resolve()
                  : Promise.reject(new Error('调整数量须为整数')),
            },
          ]}
        >
          <InputNumber precision={0} step={1} style={{ width: '100%' }} placeholder="如 +20 入库、-3 纠错" />
        </Form.Item>
        <Form.Item name="remark" label="调整原因">
          <Input.TextArea rows={2} maxLength={200} showCount placeholder="如期初建账、盘差纠正等" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
