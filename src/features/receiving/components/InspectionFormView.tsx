import { useState } from 'react'
import { Alert, App, Button, Card, Descriptions, Form, Input, InputNumber, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { useInspectionDetail } from '../hooks/useReceivingQueries'
import { useReceivingMutations } from '../hooks/useReceivingMutations'
import { INSPECTION_RESULT_META, type InspectionItem } from '../types'

interface InspectionFormViewProps {
  id: string
  onCancel: () => void
  /** 提交验收成功后回调（父级返回列表）。 */
  onSubmitted: () => void
}

/**
 * 验收操作视图：对照应收 / 实收逐行填写合格数量（0 ~ 实收，默认全部合格），
 * 不合格数量 = 实收 − 合格（服务端按明细汇总判定全部 / 部分 / 全部不合格结论）。
 * 提交后订单进入已验收，合格数量进入入库环节（库存模块落地后写入流水）。
 * 合格数量放组件内状态，只记录用户显式改过的行，单据切换由父级以 key 重挂载。
 */
export function InspectionFormView({ id, onCancel, onSubmitted }: InspectionFormViewProps) {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const canSubmit = has('receiving:inspection:submit')
  const { data, isLoading, error } = useInspectionDetail(id)
  const { submitInspection } = useReceivingMutations()
  const [form] = Form.useForm<{ remark?: string }>()
  const [qualifiedMap, setQualifiedMap] = useState<Record<string, number>>({})

  /** 行的当前合格数量：显式修改优先，否则默认 = 实收数量（全部合格）。 */
  const qualifiedOf = (item: InspectionItem): number => qualifiedMap[item.productId] ?? item.receivedQty

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="route-fallback" role="status" aria-label="验收操作加载中">
          <Spin size="large" />
        </div>
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="dashboard-page">
        <Alert
          type="error"
          showIcon
          message="验收单加载失败"
          description={error?.message ?? '验收单不存在'}
          action={<Button onClick={onCancel}>返回列表</Button>}
        />
      </div>
    )
  }
  // 状态兜底：仅待验收单可提交；结论落定后单据不可修改。
  if (data.result !== 'pending') {
    return (
      <div className="dashboard-page">
        <Alert
          type="warning"
          showIcon
          message="当前验收单已提交结论"
          description={`验收结论「${INSPECTION_RESULT_META[data.result].label}」已落定且不可修改；如需调整请走第二阶段的冲正流程。`}
          action={<Button onClick={onCancel}>返回列表</Button>}
        />
      </div>
    )
  }

  const handleSubmit = () => {
    submitInspection.mutate(
      {
        id: data.id,
        payload: {
          remark: form.getFieldValue('remark')?.trim() || undefined,
          items: data.items.map((item) => {
            const qualifiedQty = qualifiedOf(item)
            return {
              productId: item.productId,
              qualifiedQty,
              unqualifiedQty: item.receivedQty - qualifiedQty,
            }
          }),
        },
      },
      {
        onSuccess: (record) => {
          message.success(`验收单 ${record.code} 已提交，结论「${INSPECTION_RESULT_META[record.result].label}」`)
          onSubmitted()
        },
        onError: (mutationError) => message.error(mutationError.message),
      },
    )
  }

  const columns: ColumnsType<InspectionItem> = [
    {
      title: '商品',
      render: (_, item) => (
        <div className="min-w-0">
          <Typography.Text className="block truncate">{item.productName}</Typography.Text>
          <Typography.Text type="secondary" className="block truncate text-xs">
            {item.productCode} · {item.spec}
          </Typography.Text>
        </div>
      ),
    },
    { title: '单位', dataIndex: 'unit', width: 70 },
    { title: '订单数量', dataIndex: 'orderedQty', width: 100, align: 'right' },
    { title: '实收数量', dataIndex: 'receivedQty', width: 100, align: 'right' },
    {
      title: '合格数量',
      key: 'qualifiedQty',
      width: 160,
      render: (_, item) => (
        <InputNumber
          min={0}
          max={item.receivedQty}
          precision={0}
          value={qualifiedOf(item)}
          onChange={(value) =>
            setQualifiedMap((prev) => ({ ...prev, [item.productId]: typeof value === 'number' ? value : 0 }))
          }
          disabled={!canSubmit}
          aria-label={`${item.productName} 合格数量`}
        />
      ),
    },
    {
      // 不合格数量由「实收 − 合格」派生展示，避免行内两输入框之和的校验成本。
      title: '不合格数量',
      key: 'unqualifiedQty',
      width: 110,
      align: 'right',
      render: (_, item) => {
        const unqualified = item.receivedQty - qualifiedOf(item)
        return unqualified > 0 ? (
          <Typography.Text strong type="danger">
            {unqualified}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">0</Typography.Text>
        )
      },
    },
    {
      title: '行备注',
      dataIndex: 'remark',
      render: (value: string | undefined) =>
        value ? <span>{value}</span> : <Typography.Text type="secondary">—</Typography.Text>,
    },
  ]

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <Typography.Title level={2} className="mb-0!">
            提交验收
          </Typography.Title>
          <Typography.Text type="secondary" className="block">
            {`${data.code} · 对照实收数量填写合格数量，提交后订单进入「已验收」`}
          </Typography.Text>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={onCancel}>
          取消
        </Button>
      </div>

      <Card size="small" className="mt-4">
        <Descriptions column={4} size="small">
          <Descriptions.Item label="关联收货单">{data.receiptCode}</Descriptions.Item>
          <Descriptions.Item label="关联订单">{data.orderCode}</Descriptions.Item>
          <Descriptions.Item label="供应商">{data.supplierName}</Descriptions.Item>
          <Descriptions.Item label="商品种类">{data.items.length}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="验收明细" className="mt-4">
        <Table<InspectionItem>
          rowKey="id"
          columns={columns}
          dataSource={data.items}
          pagination={false}
          scroll={{ x: 860 }}
          summary={(rows) => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}>
                <Typography.Text strong>合计（{rows.length} 项）</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <Typography.Text strong type="success">
                  {rows.reduce((sum, item) => sum + qualifiedOf(item), 0)}
                </Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <Typography.Text strong type="danger">
                  {rows.reduce((sum, item) => sum + (item.receivedQty - qualifiedOf(item)), 0)}
                </Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6}>
                <span> </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
        {!canSubmit ? (
          <Alert className="mt-4" type="info" showIcon message="你没有「提交验收」权限，仅可查看验收内容" />
        ) : null}
        <Form form={form} layout="vertical" className="mt-4 mb-0">
          <Form.Item label="验收备注" name="remark" className="mb-0">
            <Input.TextArea
              rows={2}
              placeholder="不合格原因、处理方式等说明（选填）"
              maxLength={200}
              showCount
              disabled={!canSubmit}
            />
          </Form.Item>
        </Form>
        <div className="mt-4 flex justify-end gap-3">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" loading={submitInspection.isPending} disabled={!canSubmit} onClick={handleSubmit}>
            提交验收
          </Button>
        </div>
      </Card>
    </div>
  )
}
