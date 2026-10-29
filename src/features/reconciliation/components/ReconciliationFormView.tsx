import { useEffect, useMemo, useState } from 'react'
import { Alert, App, Button, Card, DatePicker, Form, Input, Select, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { useSupplierOptions } from '@/features/supplier/hooks/useSuppliers'
import { useReconciliationDetail, useReconciliationMutations, useReconciliationPool } from '../hooks'
import { formatMoney } from '@/utils'
import type { ReconciliationPoolRecord } from '../types'

interface ReconciliationFormViewProps {
  /** 编辑草稿时的对账单 id；缺省为新建模式。 */
  editId?: string
  /** 从单据池「发起对账」深链进入时预选的收货单 id 与供应商（单供应商校验由入口完成）。 */
  initialReceiptIds?: string[]
  initialSupplierId?: string
  onCancel: () => void
  /** 保存草稿 / 生成并提交成功后回调。 */
  onSaved: (recordCode: string, submitted: boolean) => void
}

interface FormValues {
  supplierId?: string
  periodRange?: [Dayjs, Dayjs] | null
  remark?: string
}

/**
 * 新建 / 编辑对账单视图：选供应商 + 对账期间 → 拉取该供应商期间内可对账单据
 * （已收货且未被其他对账单纳入）→ 勾选整单纳入 → 保存草稿或生成并提交。
 *
 * - 编辑草稿：供应商锁定（明细与供应商强绑定），草稿已纳入的单据与本池合并展示并预选；
 * - 金额由服务端按明细推导，此处仅展示勾选单据的应付 / 已付合计供参考；
 * - 单据池口径 = 整单对账（勾选单元为收货单，部分行对账为二期）。
 */
export function ReconciliationFormView({
  editId,
  initialReceiptIds,
  initialSupplierId,
  onCancel,
  onSaved,
}: ReconciliationFormViewProps) {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const canCreate = has('reconciliation:list:create')
  const { data: supplierOptions } = useSupplierOptions()
  const { createReconciliation, updateReconciliation } = useReconciliationMutations()
  // SupplierOption 是原始实体（id/name/contactPerson），须映射成 Select 需要的 value/label
  // （与采购订单表单同款）；label 拼联系人便于区分同名供应商，也供深链回填的就绪判断使用。
  const supplierSelectOptions = useMemo(
    () =>
      supplierOptions.map((supplier) => ({
        value: supplier.id,
        label: `${supplier.name} · ${supplier.contactPerson}`,
      })),
    [supplierOptions],
  )

  const [form] = Form.useForm<FormValues>()
  // 勾选的收货单 id（与表格行解耦：期间变更导致池刷新时勾选不丢）。
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [supplierId, setSupplierId] = useState<string | undefined>(initialSupplierId)
  const [period, setPeriod] = useState<{ start?: string; end?: string }>({})
  // 保存取向：控制两个提交按钮各自的 loading（草稿 / 提交互斥展示）。
  const [savingMode, setSavingMode] = useState<'draft' | 'submit' | null>(null)

  const isEdit = Boolean(editId)
  const { data: draft, isLoading: draftLoading, error: draftError } = useReconciliationDetail(editId)

  // 可对账单据池：限当前供应商；期间已选时仅拉取期间内收货的单据。
  const { data: pool, isLoading: poolLoading } = useReconciliationPool({
    supplierId,
    ...(period.start ? { receivedFrom: period.start } : {}),
    ...(period.end ? { receivedTo: period.end } : {}),
    current: 1,
    pageSize: 100,
  })

  // 下拉仅含启用供应商，但停用供应商的历史收货单仍需对账（深链/草稿可能命中停用商）：
  // 用单据池 / 草稿里的名称快照补一个选项，保证回显名称且不阻塞回填。
  const currentOptionMissing = Boolean(supplierId) && !supplierSelectOptions.some((opt) => opt.value === supplierId)
  const currentSupplierName =
    supplierId && draft?.supplierId === supplierId
      ? draft.supplierName
      : pool?.lists.find((row) => row.supplierId === supplierId)?.supplierName
  const supplierSelectOptionsMerged = useMemo(() => {
    if (!currentOptionMissing || !supplierId || !currentSupplierName) return supplierSelectOptions
    return [{ value: supplierId, label: `${currentSupplierName}（已停用）` }, ...supplierSelectOptions]
  }, [currentOptionMissing, supplierId, currentSupplierName, supplierSelectOptions])

  // 草稿已纳入的单据不在池里（被本草稿占用），由明细按收货单聚合还原为池行并合并。
  const draftRows = useMemo<ReconciliationPoolRecord[]>(() => {
    if (!draft) return []
    const grouped = new Map<string, ReconciliationPoolRecord>()
    for (const item of draft.items) {
      const existing = grouped.get(item.receiptId)
      if (existing) {
        existing.payableAmount = Math.round((existing.payableAmount + item.amount) * 100) / 100
        existing.paidAmount = Math.round((existing.paidAmount + item.paidAmount) * 100) / 100
        existing.receivedQty += item.receivedQty
      } else {
        grouped.set(item.receiptId, {
          receiptId: item.receiptId,
          receiptCode: item.receiptCode,
          orderId: item.orderId,
          orderCode: item.orderCode,
          supplierId: draft.supplierId,
          supplierName: draft.supplierName,
          productSummary: item.productName,
          itemCount: 1,
          receivedQty: item.receivedQty,
          payableAmount: item.amount,
          paidAmount: item.paidAmount,
          receivedAt: item.receivedAt,
        })
      }
    }
    // 多商品收货单的摘要补「等 N 项」。
    const itemCountByReceipt = new Map<string, number>()
    for (const item of draft.items) {
      itemCountByReceipt.set(item.receiptId, (itemCountByReceipt.get(item.receiptId) ?? 0) + 1)
    }
    for (const row of grouped.values()) {
      const count = itemCountByReceipt.get(row.receiptId) ?? 1
      if (count > 1) row.productSummary = `${row.productSummary} 等 ${count} 项`
      row.itemCount = count
    }
    return [...grouped.values()]
  }, [draft])

  // 合并展示：池行（可勾选）在前，草稿已纳入行紧随（同样可取消勾选 = 从草稿移除）。
  const mergedRows = useMemo(() => {
    const draftReceiptIds = new Set(draftRows.map((row) => row.receiptId))
    const poolRows = (pool?.lists ?? []).filter((row) => !draftReceiptIds.has(row.receiptId))
    return [...poolRows, ...draftRows]
  }, [pool, draftRows])

  // 编辑模式：进入时用草稿回填表单与勾选（明细按收货单去重得单据清单）。
  useEffect(() => {
    if (!draft) return
    form.setFieldsValue({
      supplierId: draft.supplierId,
      periodRange: [dayjs(draft.periodStart), dayjs(draft.periodEnd)],
      remark: draft.remark,
    })
    setSupplierId(draft.supplierId)
    setPeriod({ start: draft.periodStart, end: draft.periodEnd })
    setSelectedIds([...new Set(draft.items.map((item) => item.receiptId))])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id])

  // 深链进入（新建）：池数据到位后预选入口带入的单据，并把供应商回填到表单项
  // （表单展示与查询状态解耦：supplierId state 驱动池查询，Form 字段负责回显）。
  useEffect(() => {
    if (isEdit || !initialReceiptIds?.length) return
    const poolRows = pool?.lists ?? []
    const matched = initialReceiptIds.filter((id) => poolRows.some((row) => row.receiptId === id))
    if (matched.length && selectedIds.length === 0) {
      setSelectedIds(matched)
    }
    // 供应商：URL 参数优先；未带时按首张勾选单据回填（入口已做单供应商校验）。
    // 须等下拉选项就绪且包含目标值再回填表单项，否则 Select 会闪现原始 id。
    const supplierToFill = supplierId ?? poolRows.find((row) => matched.includes(row.receiptId))?.supplierId
    const optionsReady = supplierSelectOptionsMerged.some((opt) => opt.value === supplierToFill)
    if (supplierToFill && optionsReady && form.getFieldValue('supplierId') !== supplierToFill) {
      form.setFieldsValue({ supplierId: supplierToFill })
    }
    if (supplierToFill && !supplierId) setSupplierId(supplierToFill)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, supplierOptions])

  const handleSupplierChange = (value: string) => {
    setSupplierId(value)
    // 切换供应商后原勾选单据不再属于该供应商，全部作废重来。
    setSelectedIds([])
  }

  const handlePeriodChange = (range: [Dayjs | null, Dayjs | null] | null) => {
    setPeriod({
      start: range?.[0]?.format('YYYY-MM-DD'),
      end: range?.[1]?.format('YYYY-MM-DD'),
    })
  }

  const selectedRows = mergedRows.filter((row) => selectedIds.includes(row.receiptId))
  const totalPayable = Math.round(selectedRows.reduce((sum, row) => sum + row.payableAmount, 0) * 100) / 100
  const totalPaid = Math.round(selectedRows.reduce((sum, row) => sum + row.paidAmount, 0) * 100) / 100

  /** 提交（保存草稿 / 生成并提交共用）：校验供应商、期间与勾选单据。 */
  const handleSave = (submit: boolean) => {
    form.validateFields().then((values) => {
      setSavingMode(submit ? 'submit' : 'draft')
      const payload = {
        periodStart: values.periodRange![0].format('YYYY-MM-DD'),
        periodEnd: values.periodRange![1].format('YYYY-MM-DD'),
        receiptIds: selectedIds,
        remark: values.remark?.trim() || undefined,
        submit,
      }
      const onError = (mutationError: Error) => {
        setSavingMode(null)
        message.error(mutationError.message)
      }
      if (isEdit && editId) {
        updateReconciliation.mutate(
          { id: editId, ...payload },
          { onSuccess: (record) => onSaved(record.code, submit), onError },
        )
      } else if (supplierId) {
        createReconciliation.mutate(
          { supplierId, ...payload },
          { onSuccess: (record) => onSaved(record.code, submit), onError },
        )
      } else {
        setSavingMode(null)
      }
    })
  }

  const columns: ColumnsType<ReconciliationPoolRecord> = [
    { title: '收货单号', dataIndex: 'receiptCode', width: 160 },
    { title: '订单号', dataIndex: 'orderCode', width: 160 },
    { title: '商品摘要', dataIndex: 'productSummary', ellipsis: true },
    { title: '明细', dataIndex: 'itemCount', width: 70, align: 'right', render: (value: number) => `${value} 行` },
    { title: '实收数量', dataIndex: 'receivedQty', width: 90, align: 'right' },
    {
      title: '应付金额',
      dataIndex: 'payableAmount',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    { title: '收货日期', dataIndex: 'receivedAt', width: 105 },
  ]

  if (isEdit && draftLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="对账草稿加载中">
          <Spin size="large" />
        </div>
      </div>
    )
  }
  if (isEdit && (draftError || !draft)) {
    return (
      <div className="dashboard-page">
        <Alert
          type="error"
          showIcon
          message="对账草稿加载失败"
          description={draftError?.message ?? '对账单不存在或已被移除'}
          action={<Button onClick={onCancel}>返回列表</Button>}
        />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            {isEdit ? '编辑对账草稿' : '新建对账单'}
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            选择供应商与对账期间后拉取可对账单据，勾选整单纳入；保存草稿可稍后继续编辑，生成并提交后等待财务确认
          </Typography.Text>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={onCancel}>
          取消
        </Button>
      </div>

      <Card size="small" className="mt-4" title="基本信息">
        <Form form={form} layout="vertical">
          <div className="grid gap-4 md:grid-cols-3">
            <Form.Item name="supplierId" label="供应商" rules={[{ required: true, message: '请选择供应商' }]}>
              <Select
                placeholder="请选择供应商"
                showSearch
                optionFilterProp="label"
                options={supplierSelectOptionsMerged}
                disabled={isEdit || !canCreate}
                onChange={handleSupplierChange}
              />
            </Form.Item>
            <Form.Item
              name="periodRange"
              label="对账期间"
              rules={[
                { required: true, message: '请选择对账期间' },
                {
                  validator: (_, value: [Dayjs, Dayjs] | null | undefined) => {
                    if (value?.[0] && value?.[1] && value[0].isAfter(value[1], 'day')) {
                      return Promise.reject(new Error('开始日期不能晚于结束日期'))
                    }
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                allowClear={false}
                disabled={!canCreate}
                onChange={(range) => handlePeriodChange(Array.isArray(range) ? range : null)}
              />
            </Form.Item>
            <Form.Item name="remark" label="对账备注（选填）">
              <Input placeholder="如「9 月上半月对账」" maxLength={100} disabled={!canCreate} />
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card
        size="small"
        className="mt-4"
        title={`可对账单据（${supplierId ? `已按供应商与期间过滤，共 ${mergedRows.length} 张` : '请先选择供应商'}）`}
      >
        {supplierId ? (
          <>
            <Table<ReconciliationPoolRecord>
              rowKey="receiptId"
              columns={columns}
              dataSource={mergedRows}
              loading={poolLoading}
              pagination={false}
              scroll={{ x: 1000 }}
              rowSelection={{
                selectedRowKeys: selectedIds,
                onChange: (keys) => setSelectedIds(keys as string[]),
                getCheckboxProps: () => ({ disabled: !canCreate }),
                // 深链预选/草稿回填与用户点选共用同一受选状态。
                selections: true,
              }}
              locale={{ emptyText: '该供应商当前没有待对账单据（已收货且未被其他对账单纳入）' }}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <Typography.Text strong>已选 {selectedRows.length} 张单据</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Typography.Text strong>¥{formatMoney(totalPayable)}</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <Typography.Text strong>¥{formatMoney(totalPaid)}</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} colSpan={2} align="right">
                    <Typography.Text strong type="warning">
                      待付 ¥{formatMoney(totalPayable - totalPaid)}
                    </Typography.Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
            {selectedIds.length === 0 ? (
              <Alert
                className="mt-4"
                type="info"
                showIcon
                message="请至少勾选一张可对账单据"
                description="对账按整单纳入（收货单为单位）；保存草稿前至少勾选一张单据。"
              />
            ) : null}
          </>
        ) : (
          <Typography.Text type="secondary">选择供应商后自动拉取其名下可对账的已收货单据</Typography.Text>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button onClick={onCancel}>取消</Button>
          <Button
            disabled={!canCreate || selectedIds.length === 0 || savingMode !== null}
            loading={savingMode === 'draft'}
            onClick={() => handleSave(false)}
          >
            保存草稿
          </Button>
          <Button
            type="primary"
            disabled={!canCreate || selectedIds.length === 0 || savingMode !== null}
            loading={savingMode === 'submit'}
            onClick={() => handleSave(true)}
          >
            生成并提交
          </Button>
        </div>
      </Card>
    </div>
  )
}
