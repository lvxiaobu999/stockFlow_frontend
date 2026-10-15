import { useMemo, useState } from 'react'
import { App, Button, Card, Col, Form, Input, InputNumber, Radio, Row, Select, TreeSelect, Upload } from 'antd'
import type { UploadFile } from 'antd'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/common/PageHeader'
import { useProductMutations } from '@/features/product/hooks/useProductMutations'
import { useNextProductCode } from '@/features/product/hooks/useProducts'
import { isProductImageValid } from '@/features/product/utils/validators'
import { toCategoryOptions } from '@/features/product/utils/categoryTree'
import { PRODUCT_UNITS } from '@/features/product/types'
import type { CategoryRecord, ProductRecord } from '@/features/product/types'

interface ProductFormViewProps {
  /** 编辑目标；null 表示新建。 */
  product: ProductRecord | null
  /** 全量扁平分类记录（构建分类树下拉）。 */
  categories: CategoryRecord[]
  onCancel: () => void
  /** 保存成功后回调（页面切回列表）。 */
  onSaved: (record: ProductRecord) => void
}

interface ProductFormValues {
  categoryId: string
  name: string
  spec: string
  unit: (typeof PRODUCT_UNITS)[number]
  purchasePrice: number
  salePrice?: number
  safetyStock: number
  description?: string
  status: 1 | 0
}

/**
 * 商品新建 / 编辑视图（页内整页表单，非弹窗）。
 *
 * - 编码服务端生成：新建时预取展示、禁改；编辑时只读回显；
 * - 主图仅会话期内存活（base64 存内存，刷新丢失，文档已记录）；
 * - 规格、采购参考价按原型口径必填（数据库设计允许空的偏差已记录）。
 */
export function ProductFormView({ product, categories, onCancel, onSaved }: ProductFormViewProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<ProductFormValues>()
  const { create, update } = useProductMutations()
  const isEdit = product !== null

  const { code: nextCode } = useNextProductCode(!isEdit)
  // 主图不走 Form 数据流：base64 状态独立维护，提交时并入载荷。
  // 组件由页面以 product.id（或 'create'）为 key 重挂载，state 直接用初值实例化。
  const [imageData, setImageData] = useState<string | undefined>(product?.imageUrl)

  const categoryOptions = useMemo(() => toCategoryOptions(categories), [categories])

  // 表单初值：编辑回显、新建默认（同上，依赖 key 重挂载而非 effect 回填）。
  const initialValues = useMemo(
    () =>
      product
        ? {
            categoryId: product.categoryId,
            name: product.name,
            spec: product.spec,
            unit: product.unit,
            purchasePrice: product.purchasePrice,
            salePrice: product.salePrice,
            safetyStock: product.safetyStock,
            description: product.description,
            status: product.status,
          }
        : { unit: '个', safetyStock: 0, status: 1 as const },
    [product],
  )

  /** 图片校验与 base64 转换：beforeUpload 返回 false 表示不上传、仅本地暂存。 */
  const handleBeforeUpload = (file: UploadFile) => {
    // antd 传入的实参是 RcFile（extends File），静态类型只标注为 UploadFile，这里断言回 File 形态。
    const raw = file as unknown as Pick<File, 'type' | 'size'>
    const check = isProductImageValid(raw)
    if (!check.ok) {
      message.error(check.reason)
      return Upload.LIST_IGNORE
    }
    const reader = new FileReader()
    reader.onload = () => setImageData(String(reader.result))
    reader.readAsDataURL(file as unknown as Blob)
    return false
  }

  const handleSubmit = (values: ProductFormValues) => {
    const payload = {
      categoryId: values.categoryId,
      name: values.name.trim(),
      spec: values.spec.trim(),
      unit: values.unit,
      purchasePrice: values.purchasePrice,
      salePrice: values.salePrice,
      safetyStock: values.safetyStock,
      imageUrl: imageData,
      description: values.description,
      status: values.status,
    }
    const fail = (error: Error) => message.error(error.message)
    if (isEdit && product) {
      update.mutate(
        { id: product.id, payload },
        {
          onSuccess: (record) => {
            message.success(`商品 ${record.name} 已更新`)
            onSaved(record)
          },
          onError: fail,
        },
      )
      return
    }
    create.mutate(payload, {
      onSuccess: (record) => {
        message.success(`商品 ${record.name} 已创建（编码 ${record.code}）`)
        onSaved(record)
      },
      onError: fail,
    })
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title={isEdit ? `编辑商品 · ${product?.name}` : '新建商品'}
        description={isEdit ? `商品编码 ${product?.code}，创建后不可修改` : '编码将由系统自动生成'}
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
        <Form<ProductFormValues>
          form={form}
          layout="vertical"
          className="max-w-3xl"
          initialValues={initialValues}
          onFinish={handleSubmit}
        >
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="商品编码">
                <Input
                  disabled
                  placeholder="保存后由系统生成"
                  value={isEdit ? product?.code : (nextCode ?? undefined)}
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                label="商品名称"
                name="name"
                rules={[
                  { required: true, whitespace: true, message: '请输入商品名称' },
                  { max: 200, message: '商品名称不超过 200 个字符' },
                ]}
              >
                <Input placeholder="如 晨光复印纸 A4 80g" maxLength={200} autoComplete="off" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="商品分类"
                name="categoryId"
                rules={[{ required: true, message: '请选择商品分类' }]}
                extra="停用分类不可选；分类决定商品的归属层级"
              >
                <TreeSelect placeholder="请选择分类" treeData={categoryOptions} treeDefaultExpandAll />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="规格型号"
                name="spec"
                rules={[{ required: true, whitespace: true, message: '请输入规格型号' }]}
              >
                <Input placeholder="如 500张/包×5包/箱" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="计量单位" name="unit" rules={[{ required: true }]}>
                <Select options={PRODUCT_UNITS.map((unit) => ({ value: unit, label: unit }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={6}>
              <Form.Item
                label="采购参考价（元）"
                name="purchasePrice"
                rules={[{ required: true, message: '请输入采购参考价' }]}
                extra="采购下单时的默认参考价"
              >
                <InputNumber className="w-full" min={0.01} max={99999999} precision={2} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="销售参考价（元）" name="salePrice" extra="预留字段，本期仅保存展示">
                <InputNumber className="w-full" min={0} max={99999999} precision={2} placeholder="选填" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="安全库存"
                name="safetyStock"
                rules={[{ required: true, message: '请输入安全库存' }]}
                extra="总库存低于该值时触发预警"
              >
                <InputNumber className="w-full" min={0} max={9999999} precision={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
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
          <Form.Item label="商品主图" extra="支持 JPG / PNG，不超过 2MB，最多 1 张（仅本次会话内生效）">
            <Upload
              listType="picture-card"
              accept="image/jpeg,image/png"
              maxCount={1}
              fileList={imageData ? [{ uid: '-1', name: '商品主图', status: 'done', url: imageData }] : []}
              beforeUpload={handleBeforeUpload}
              onRemove={() => setImageData(undefined)}
            >
              {!imageData ? (
                <div aria-hidden="true">
                  <PlusOutlined />
                  <div className="mt-1 text-xs">上传</div>
                </div>
              ) : null}
            </Upload>
          </Form.Item>
          <Form.Item label="商品描述" name="description">
            <Input.TextArea rows={4} placeholder="选填，补充商品说明" maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
