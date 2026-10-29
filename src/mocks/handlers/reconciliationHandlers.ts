import dayjs from 'dayjs'
import { delay, http } from 'msw'
import type {
  CloseReconciliationPayload,
  ConfirmReconciliationPayload,
  CreateReconciliationPayload,
  MarkDiffReconciliationPayload,
  ReconciliationDiffType,
  ReconciliationPoolRecord,
  ReconciliationRecord,
  ReconciliationStatus,
  SubmitReconciliationPayload,
  UpdateReconciliationPayload,
} from '@/features/reconciliation/types'
import { getMockSession } from '@/mocks/data/auth'
import {
  buildReconciliationPool,
  buildReconciliationSummary,
  createReconciliationRow,
  reconsMock,
  toReconciliationRecord,
} from '@/mocks/data/reconciliation'
import { receiptsMock } from '@/mocks/data/receiving'
import { appendLog } from '@/mocks/data/operation-logs'
import { paginate } from '@/mocks/pagination'
import { businessError, httpError, ok } from '@/mocks/utils'

/**
 * 对账接口：对账单分页 / 详情 / 创建 / 编辑草稿 / 提交 / 确认 / 标记差异 / 关闭，
 * 外加待对账单据池与汇总看板。金额一律由明细实时推导，接口不接收金额字段。
 *
 * 错误码分段（50xx）：5001 对账单不存在、5002 当前状态不允许该操作、
 * 5003 对账期间无效、5004 可对账单据校验失败、5005 差异信息不完整；
 * 通用段沿用 40xx（4001 参数缺失）。
 */
const RECON_NOT_FOUND = 5001
const RECON_STATE_INVALID = 5002
const RECON_PERIOD_INVALID = 5003
const RECON_RECEIPTS_INVALID = 5004
const RECON_DIFF_INVALID = 5005

/** 对账接口的登录校验：内部管理端接口，未登录一律 401。 */
function requireSession() {
  const session = getMockSession()
  if (!session) return { session: undefined, error: httpError(401, '登录已过期，请重新登录') }
  return { session, error: undefined }
}

/** 对账审计日志便捷封装（模块固定为对账管理）。 */
function logReconciliation(operator: string, action: string, targetSummary: string): void {
  appendLog({ operator, module: 'reconciliation', action, targetSummary })
}

/** 校验「纳入对账的收货单」：存在、已收货、同一供应商、未被其他对账单纳入。 */
function validateReceipts(supplierId: string, receiptIds: string[], excludeReconId?: string) {
  if (receiptIds.length === 0) return '请至少勾选一张可对账单据'
  if (new Set(receiptIds).size !== receiptIds.length) return '单据存在重复勾选'
  for (const receiptId of receiptIds) {
    const receipt = receiptsMock.find((candidate) => candidate.id === receiptId)
    if (!receipt || receipt.status !== 'received') return '单据不存在或未完成收货'
    if (receipt.supplierId !== supplierId) return '单据与所选供应商不一致'
    // 编辑草稿时本单已纳入的收货单不算「已被对账」。
    const owner = reconsMock.find((row) => row.receiptIds.includes(receiptId))
    if (owner && owner.id !== excludeReconId) return `单据 ${receipt.code} 已被对账单 ${owner.code} 纳入`
  }
  return undefined
}

/** 对账单展示记录便捷查询。 */
function findReconRecord(id: string): ReconciliationRecord | undefined {
  const row = reconsMock.find((item) => item.id === id)
  return row ? toReconciliationRecord(row) : undefined
}

/** 记录更新时间戳（所有动作统一收口，保证 updatedAt 单调）。 */
function touch(row: (typeof reconsMock)[number]): void {
  row.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
}

/** 对账接口：10 个端点（查询 4 + 动作 5 + 汇总 1）。 */
export const reconciliationHandlers = [
  // 1) 对账单分页：供应商 / 状态 / 关键字（单号 / 供应商名）/ 对账期间（有交集即命中）。
  http.get('*/api/reconciliation/page', async ({ request }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const url = new URL(request.url)
    const current = Number(url.searchParams.get('current') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    const supplierId = url.searchParams.get('supplierId') || undefined
    const status = (url.searchParams.get('status') || undefined) as ReconciliationStatus | undefined
    const keyword = url.searchParams.get('keyword')?.trim()
    const periodFrom = url.searchParams.get('periodFrom') || undefined
    const periodTo = url.searchParams.get('periodTo') || undefined

    const records = reconsMock
      .filter((row) => (supplierId ? row.supplierId === supplierId : true))
      .filter((row) => (status ? row.status === status : true))
      .filter((row) => (keyword ? `${row.code}${row.supplierName}`.includes(keyword) : true))
      .filter((row) => {
        // 期间交集口径：periodStart ≤ 筛选止 且 periodEnd ≥ 筛选起。
        if (periodFrom && row.periodEnd < periodFrom) return false
        if (periodTo && row.periodStart > periodTo) return false
        return true
      })
      .map(toReconciliationRecord)
      // 创建时间倒序（最新发起的对账在前）。
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return ok(paginate(records, current, pageSize))
  }),

  // 2) 对账单详情（含明细）。
  http.get('*/api/reconciliation/detail', async ({ request }) => {
    await delay(240)
    const admission = requireSession()
    if (admission.error) return admission.error
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return businessError(4001, '缺少参数 id')
    const record = findReconRecord(id)
    if (!record) return businessError(RECON_NOT_FOUND, '对账单不存在')
    return ok(record)
  }),

  // 3) 创建对账单：submit 决定保存草稿或生成并提交（待确认）。
  http.post('*/api/reconciliation/create', async ({ request }) => {
    await delay(320)
    const admission = requireSession()
    if (admission.error) return admission.error
    const payload = (await request.json()) as Partial<CreateReconciliationPayload>
    if (!payload.supplierId) return businessError(4001, '请选择供应商')
    if (!payload.periodStart || !payload.periodEnd) return businessError(4001, '请选择对账期间')
    if (payload.periodStart > payload.periodEnd) {
      return businessError(RECON_PERIOD_INVALID, '对账期间无效：开始日期不能晚于结束日期')
    }
    const receiptError = validateReceipts(payload.supplierId, payload.receiptIds ?? [])
    if (receiptError) return businessError(RECON_RECEIPTS_INVALID, receiptError)

    const row = createReconciliationRow({
      supplierId: payload.supplierId,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      receiptIds: payload.receiptIds ?? [],
      remark: payload.remark?.trim() || undefined,
      submit: payload.submit,
      createdByName: admission.session.user.name,
    })
    logReconciliation(
      admission.session.user.name,
      payload.submit ? '创建对账单并提交' : '保存对账草稿',
      `对账单 ${row.code}（${row.supplierName}）`,
    )
    return ok(toReconciliationRecord(row))
  }),

  // 4) 编辑草稿：整单替换明细与期间（MVP 不做部分行对账），可顺带提交。
  http.post('*/api/reconciliation/update', async ({ request }) => {
    await delay(320)
    const admission = requireSession()
    if (admission.error) return admission.error
    const payload = (await request.json()) as Partial<UpdateReconciliationPayload>
    const row = reconsMock.find((item) => item.id === payload.id)
    if (!row) return businessError(RECON_NOT_FOUND, '对账单不存在')
    if (row.status !== 'draft') return businessError(RECON_STATE_INVALID, '仅草稿可编辑')
    if (!payload.periodStart || !payload.periodEnd) return businessError(4001, '请选择对账期间')
    if (payload.periodStart > payload.periodEnd) {
      return businessError(RECON_PERIOD_INVALID, '对账期间无效：开始日期不能晚于结束日期')
    }
    const receiptError = validateReceipts(row.supplierId, payload.receiptIds ?? [], row.id)
    if (receiptError) return businessError(RECON_RECEIPTS_INVALID, receiptError)

    row.periodStart = payload.periodStart
    row.periodEnd = payload.periodEnd
    row.receiptIds = [...(payload.receiptIds ?? [])]
    row.remark = payload.remark?.trim() || undefined
    if (payload.submit) row.status = 'pending'
    touch(row)
    logReconciliation(
      admission.session.user.name,
      payload.submit ? '编辑草稿并提交' : '编辑对账草稿',
      `对账单 ${row.code}（${row.supplierName}）`,
    )
    return ok(toReconciliationRecord(row))
  }),

  // 5) 提交：草稿 → 待确认。
  http.post('*/api/reconciliation/submit', async ({ request }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const payload = (await request.json()) as Partial<SubmitReconciliationPayload>
    const row = reconsMock.find((item) => item.id === payload.id)
    if (!row) return businessError(RECON_NOT_FOUND, '对账单不存在')
    if (row.status !== 'draft') return businessError(RECON_STATE_INVALID, '仅草稿可提交')
    row.status = 'pending'
    touch(row)
    logReconciliation(admission.session.user.name, '提交对账单', `对账单 ${row.code}（${row.supplierName}）`)
    return ok(toReconciliationRecord(row))
  }),

  // 6) 确认通过：待确认 / 有差异 → 已确认（差异视为处理完毕，清除差异标记）。
  http.post('*/api/reconciliation/confirm', async ({ request }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const payload = (await request.json()) as Partial<ConfirmReconciliationPayload>
    const row = reconsMock.find((item) => item.id === payload.id)
    if (!row) return businessError(RECON_NOT_FOUND, '对账单不存在')
    if (row.status !== 'pending' && row.status !== 'disputed') {
      return businessError(RECON_STATE_INVALID, '仅待确认或有差异的对账单可确认')
    }
    row.status = 'confirmed'
    row.confirmedByName = admission.session.user.name
    row.confirmedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    row.diffType = undefined
    row.diffAmount = undefined
    row.diffReason = undefined
    touch(row)
    logReconciliation(
      admission.session.user.name,
      '确认对账',
      `对账单 ${row.code}（${row.supplierName}）${payload.opinion?.trim() ? `：${payload.opinion.trim()}` : ''}`,
    )
    return ok(toReconciliationRecord(row))
  }),

  // 7) 标记差异：待确认 / 有差异 → 有差异（可重复标记更新差异信息）。
  http.post('*/api/reconciliation/mark-diff', async ({ request }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const payload = (await request.json()) as Partial<MarkDiffReconciliationPayload>
    const row = reconsMock.find((item) => item.id === payload.id)
    if (!row) return businessError(RECON_NOT_FOUND, '对账单不存在')
    if (row.status !== 'pending' && row.status !== 'disputed') {
      return businessError(RECON_STATE_INVALID, '仅待确认或有差异的对账单可标记差异')
    }
    if (!payload.diffType) return businessError(RECON_DIFF_INVALID, '请选择差异类型')
    if (!payload.reason?.trim()) return businessError(RECON_DIFF_INVALID, '请填写差异说明')
    if (payload.diffAmount !== undefined && (!Number.isFinite(payload.diffAmount) || payload.diffAmount < 0)) {
      return businessError(RECON_DIFF_INVALID, '差异金额须为不小于 0 的数字')
    }
    row.status = 'disputed'
    row.diffType = payload.diffType as ReconciliationDiffType
    row.diffAmount = payload.diffAmount
    row.diffReason = payload.reason.trim()
    touch(row)
    logReconciliation(
      admission.session.user.name,
      '标记差异',
      `对账单 ${row.code}（${row.supplierName}）：${payload.reason.trim()}`,
    )
    return ok(toReconciliationRecord(row))
  }),

  // 8) 关闭：已确认 → 已关闭（关联付款完成或手动关闭，终态）。
  http.post('*/api/reconciliation/close', async ({ request }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const payload = (await request.json()) as Partial<CloseReconciliationPayload>
    const row = reconsMock.find((item) => item.id === payload.id)
    if (!row) return businessError(RECON_NOT_FOUND, '对账单不存在')
    if (row.status !== 'confirmed') return businessError(RECON_STATE_INVALID, '仅已确认的对账单可关闭')
    row.status = 'closed'
    row.closedByName = admission.session.user.name
    row.closedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    row.closedRemark = payload.remark?.trim() || undefined
    touch(row)
    logReconciliation(admission.session.user.name, '关闭对账单', `对账单 ${row.code}（${row.supplierName}）`)
    return ok(toReconciliationRecord(row))
  }),

  // 9) 待对账单据池：已收货且未被任何对账单纳入的收货单。
  http.get('*/api/reconciliation/pending-pool', async ({ request }) => {
    await delay(280)
    const admission = requireSession()
    if (admission.error) return admission.error
    const url = new URL(request.url)
    const current = Number(url.searchParams.get('current') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    const supplierId = url.searchParams.get('supplierId') || undefined
    const keyword = url.searchParams.get('keyword')?.trim()
    const receivedFrom = url.searchParams.get('receivedFrom') || undefined
    const receivedTo = url.searchParams.get('receivedTo') || undefined

    const records: ReconciliationPoolRecord[] = buildReconciliationPool()
      .filter((row) => (supplierId ? row.supplierId === supplierId : true))
      .filter((row) => (keyword ? `${row.orderCode}${row.receiptCode}${row.productSummary}`.includes(keyword) : true))
      .filter((row) => {
        if (receivedFrom && row.receivedAt < receivedFrom) return false
        if (receivedTo && row.receivedAt > receivedTo) return false
        return true
      })
    return ok(paginate(records, current, pageSize))
  }),

  // 10) 对账汇总看板：四卡指标 + 近期待处理列表。
  http.get('*/api/reconciliation/summary', async () => {
    await delay(240)
    const admission = requireSession()
    if (admission.error) return admission.error
    return ok(buildReconciliationSummary())
  }),
]
