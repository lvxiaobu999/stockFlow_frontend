import { useEffect, useMemo } from 'react'
import { App, Form, Input, InputNumber, Modal, Radio, TreeSelect } from 'antd'
import { useCategoryMutations } from '@/features/product/hooks/useCategoryMutations'
import { useNextCategoryCode } from '@/features/product/hooks/useCategories'
import { toCategoryOptions } from '@/features/product/utils/categoryTree'
import type { CategoryRecord } from '@/features/product/types'

interface CategoryFormModalProps {
  open: boolean
  /** 编辑目标；null 表示新建。 */
  category: CategoryRecord | null
  /** 从树节点菜单「新建子分类」进入时的预选上级 id。 */
  initialParentId: string | null
  /** 全量扁平分类记录（构建上级下拉）。 */
  records: CategoryRecord[]
  onClose: () => void
}

interface CategoryFormValues {
  parentId?: string
  name: string
  sort: number
  status: 1 | 0
  remark?: string
}

/**
 * 分类新建 / 编辑弹窗（480px）。
 *
 * 编码由服务端按层级段式生成，新建时随所选上级实时预览、不可编辑；
 * 编辑时上级不可选自身及子孙（toCategoryOptions excludeId）。
 */
export function CategoryFormModal({ open, category, initialParentId, records, onClose }: CategoryFormModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<CategoryFormValues>()
  const { create, update } = useCategoryMutations()
  const isEdit = category !== null

  // 上级分类表单值：驱动编码预览随选择变化（useWatch 在渲染期取值，无额外 state）。
  const watchedParentId = Form.useWatch('parentId', form)
  const parentOptions = useMemo(
    () => toCategoryOptions(records, isEdit ? { excludeId: category.id } : undefined),
    [records, isEdit, category],
  )
  const { code: nextCode } = useNextCategoryCode(watchedParentId ?? null, open && !isEdit)

  useEffect(() => {
    if (!open) return
    if (category) {
      form.setFieldsValue({
        parentId: category.parentId ?? undefined,
        name: category.name,
        sort: category.sort,
        status: category.status,
        remark: category.remark,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ sort: 1, status: 1, parentId: initialParentId ?? undefined })
    }
  }, [open, category, initialParentId, form])

  const handleSubmit = (values: CategoryFormValues) => {
    const payload = {
      parentId: values.parentId ?? null,
      name: values.name.trim(),
      sort: values.sort,
      status: values.status,
      remark: values.remark,
    }
    const fail = (error: Error) => message.error(error.message)
    if (isEdit && category) {
      update.mutate(
        { id: category.id, payload },
        {
          onSuccess: () => {
            message.success(`分类 ${payload.name} 已更新`)
            onClose()
          },
          onError: fail,
        },
      )
      return
    }
    create.mutate(payload, {
      onSuccess: () => {
        message.success(`分类 ${payload.name} 已创建`)
        onClose()
      },
      onError: fail,
    })
  }

  return (
    <Modal
      title={isEdit ? `编辑分类 · ${category?.name}` : '新建分类'}
      open={open}
      width={480}
      onCancel={onClose}
      okText={isEdit ? '保存' : '创建'}
      cancelText="取消"
      confirmLoading={create.isPending || update.isPending}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form<CategoryFormValues>
        form={form}
        layout="vertical"
        className="mt-4"
        initialValues={{ sort: 1, status: 1 }}
        onFinish={handleSubmit}
      >
        <Form.Item label="上级分类" name="parentId" extra="不选择则为顶级分类，层级最多 3 级">
          <TreeSelect allowClear placeholder="顶级分类" treeData={parentOptions} treeDefaultExpandAll />
        </Form.Item>
        <Form.Item label="分类编码" help={isEdit ? undefined : '编码由系统按层级段式生成，创建后只读展示'}>
          <Input
            disabled
            placeholder={isEdit ? undefined : '根据所选上级自动生成'}
            value={isEdit ? category?.code : (nextCode ?? undefined)}
          />
        </Form.Item>
        <Form.Item
          label="分类名称"
          name="name"
          rules={[
            { required: true, whitespace: true, message: '请输入分类名称' },
            { max: 20, message: '分类名称不超过 20 个字符' },
          ]}
        >
          <Input placeholder="如 复印纸" maxLength={20} autoComplete="off" />
        </Form.Item>
        <div className="flex gap-4">
          <Form.Item label="排序" name="sort" className="w-40" extra="越小越靠前">
            <InputNumber className="w-full" min={1} max={999} precision={0} />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 1, label: '启用' },
                { value: 0, label: '停用' },
              ]}
            />
          </Form.Item>
        </div>
        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={3} placeholder="选填" maxLength={200} showCount />
        </Form.Item>
      </Form>
    </Modal>
  )
}
