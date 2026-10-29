import { useMemo, useState } from 'react'
import type { Key } from 'react'
import { Alert, App, Button, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { formatMoney, toPaginationTotal } from '@/utils'
import type { PaginatedData } from '@/services/httpClient'
import type { ReconciliationPoolRecord } from '../types'

interface ReconciliationPoolTableProps {
  data: PaginatedData<ReconciliationPoolRecord> | null
  loading: boolean
  fetching: boolean
  onPageChange: (current: number, pageSize: number) => void
  /** 单行「发起对账」：携带该单据进入新建对账视图。 */
  onLaunch: (record: ReconciliationPoolRecord) => void
  /** 批量「发起对账」：携带勾选单据进入新建对账视图（单供应商校验在此完成）。 */
  onBulkLaunch: (records: ReconciliationPoolRecord[]) => void
}

/**
 * 待对账单据池表格：已收货且未被任何对账单纳入的收货单，整单勾选发起对账。
 * 批量发起要求同一供应商（一张对账单只对一家供应商）；跨供应商勾选时提示。
 */
export function ReconciliationPoolTable({
  data,
  loading,
  fetching,
  onPageChange,
  onLaunch,
  onBulkLaunch,
}: ReconciliationPoolTableProps) {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const canCreate = has('reconciliation:list:create')
  const [selectedIds, setSelectedIds] = useState<Key[]>([])

  const selectedRows = useMemo(
    () => (data?.lists ?? []).filter((row) => selectedIds.includes(row.receiptId)),
    [data, selectedIds],
  )
  const totalPayable = Math.round(selectedRows.reduce((sum, row) => sum + row.payableAmount, 0) * 100) / 100

  /** 批量发起：勾选单据必须属于同一供应商（对账单按供应商维度汇总）。 */
  const handleBulkLaunch = () => {
    const supplierIds = new Set(selectedRows.map((row) => row.supplierId))
    if (supplierIds.size > 1) {
      message.warning('一次对账只能针对一家供应商，请勾选同一供应商的单据')
      return
    }
    onBulkLaunch(selectedRows)
  }

  const columns: ColumnsType<ReconciliationPoolRecord> = [
    { title: '收货单号', dataIndex: 'receiptCode', width: 160 },
    { title: '订单号', dataIndex: 'orderCode', width: 160 },
    { title: '供应商', dataIndex: 'supplierName', width: 150, ellipsis: true },
    { title: '商品摘要', dataIndex: 'productSummary', ellipsis: true },
    { title: '明细', dataIndex: 'itemCount', width: 70, align: 'right', render: (value: number) => `${value} 行` },
    { title: '实收数量', dataIndex: 'receivedQty', width: 90, align: 'right' },
    {
      title: '应付金额',
      dataIndex: 'payableAmount',
      width: 110,
      align: 'right',
      render: (value: number) => <Typography.Text strong>¥{formatMoney(value)}</Typography.Text>,
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      width: 110,
      align: 'right',
      render: (value: number) => `¥${formatMoney(value)}`,
    },
    { title: '收货日期', dataIndex: 'receivedAt', width: 105 },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" disabled={!canCreate} onClick={() => onLaunch(record)}>
          发起对账
        </Button>
      ),
    },
  ]

  return (
    <>
      {selectedIds.length > 0 ? (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          message={
            <Space wrap>
              <span>
                已选 {selectedIds.length} 张单据 · 应付合计 ¥{formatMoney(totalPayable)}
              </span>
              <Button type="primary" size="small" disabled={!canCreate} onClick={handleBulkLaunch}>
                批量发起对账
              </Button>
            </Space>
          }
        />
      ) : null}
      <Table<ReconciliationPoolRecord>
        rowKey="receiptId"
        columns={columns}
        dataSource={data?.lists ?? []}
        loading={loading}
        rowClassName={() => (fetching ? 'opacity-70' : '')}
        scroll={{ x: 1250 }}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys),
          getCheckboxProps: () => ({ disabled: !canCreate }),
        }}
        pagination={{
          // 后端 total 口径是总页数，换算成 antd 需要的总条数。
          total: data ? toPaginationTotal(data.total, data.pageSize) : 0,
          current: data?.current ?? 1,
          pageSize: data?.pageSize ?? 20,
          onChange: onPageChange,
          showSizeChanger: true,
          showTotal: (total) => `共 ${Math.ceil(total / (data?.pageSize ?? 20))} 页`,
        }}
        locale={{ emptyText: '暂无待对账单据：收货完成的单据会自动进入单据池' }}
      />
    </>
  )
}
