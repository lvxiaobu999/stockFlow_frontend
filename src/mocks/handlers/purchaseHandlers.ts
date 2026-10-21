import dayjs from 'dayjs'
import { delay, http } from 'msw'
import type { ApprovalRecord } from '@/features/approval/types'
import type {
  PurchaseRequestListParams,
  PurchaseRequestRecord,
  PurchaseRequestStatus,
  SavePurchaseRequestPayload,
} from '@/features/purchase/types'
import { calcItemAmount, calcTotalAmount } from '@/features/purchase/utils/purchaseRequest'
import { getMockSession } from '@/mocks/data/auth'
import { appendLog } from '@/mocks/data/operation-logs'
import { approvalRecordsMock, nextPurchaseRequestCode, purchaseRequestsMock } from '@/mocks/data/purchaseRequests'
import { findProductById, productsMock } from '@/mocks/data/products'
import { paginate } from '@/mocks/pagination'
import { businessError, httpError, ok } from '@/mocks/utils'

/** 采购申请错误码分段（45xx）：4501 不存在、4502 状态不允许、4503 明细不合法。 */
const REQUEST_NOT_FOUND = 4501
const STATUS_NOT_ALLOWED = 4502
const ITEMS_INVALID = 4503

/** 解析查询参数为列表过滤条件（MSW 的 URL 参数均为字符串）。 */
function parseParams(url: URL): PurchaseRequestListParams & { pageSize: number } {
  const current = Number(url.searchParams.get('current') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
  const status = url.searchParams.get('status')
  return {
    keyword: url.searchParams.get('keyword') ?? undefined,
    status: (status || undefined) as PurchaseRequestStatus | undefined,
    applicantId: url.searchParams.get('applicantId') ?? undefined,
    submittedFrom: url.searchParams.get('submittedFrom') ?? undefined,
    submittedTo: url.searchParams.get('submittedTo') ?? undefined,
    current,
    pageSize,
  }
}

/** 按列表参数过滤申请：keyword 匹配编号 / 主题；时间范围匹配提交时间（草稿不参与）。 */
function filterRequests(params: PurchaseRequestListParams): PurchaseRequestRecord[] {
  const keyword = params.keyword?.trim()
  return purchaseRequestsMock.filter((record) => {
    if (keyword && !`${record.code}${record.title}`.includes(keyword)) return false
    if (params.status && record.status !== params.status) return false
    if (params.applicantId && record.applicantId !== params.applicantId) return false
    if (params.submittedFrom || params.submittedTo) {
      if (!record.submittedAt) return false
      const submittedDate = record.submittedAt.slice(0, 10)
      if (params.submittedFrom && submittedDate < params.submittedFrom) return false
      if (params.submittedTo && submittedDate > params.submittedTo) return false
    }
    return true
  })
}

/**
 * 校验保存载荷并返回业务错误（null 表示通过）。
 *
 * 明细校验与服务端一致：非空、数量为正整数、参考价非负、商品存在且启用、
 * 同一商品不重复出现（重复行会让「按商品汇总采购量」产生歧义）。
 */
function findPayloadError(payload: Partial<SavePurchaseRequestPayload>) {
  if (!payload.title?.trim()) return businessError(4001, '请填写申请主题')
  if (!payload.reason?.trim()) return businessError(4001, '请填写采购原因')
  if (!payload.items || payload.items.length === 0) {
    return businessError(ITEMS_INVALID, '请至少添加一条申请明细')
  }
  for (const item of payload.items) {
    const product = findProductById(item.productId)
    if (!product || product.status === 0) return businessError(ITEMS_INVALID, '明细中包含不存在或已停用的商品')
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return businessError(ITEMS_INVALID, `商品 ${product.name} 的数量必须为正整数`)
    }
    if (item.referencePrice === undefined || item.referencePrice === null || item.referencePrice < 0) {
      return businessError(ITEMS_INVALID, `商品 ${product.name} 的参考单价不合法`)
    }
  }
  const productIds = payload.items.map((item) => item.productId)
  if (new Set(productIds).size !== productIds.length) {
    return businessError(ITEMS_INVALID, '同一商品在明细中重复出现，请合并数量')
  }
  return null
}

/** 按载荷构建明细快照：商品档案字段取自商品表，行金额服务端计算。 */
function buildItems(id: string, payload: SavePurchaseRequestPayload): PurchaseRequestRecord['items'] {
  return payload.items.map((item, index) => {
    const product = productsMock.find((candidate) => candidate.id === item.productId)
    if (!product) throw new Error(`明细引用了不存在的商品：${item.productId}`)
    return {
      id: `${id}-item-${index + 1}`,
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      spec: product.spec,
      unit: product.unit,
      quantity: item.quantity,
      referencePrice: item.referencePrice,
      amount: calcItemAmount(item.quantity, item.referencePrice),
      remark: item.remark,
    }
  })
}

/** 追加审批流水（通过/拒绝由审批中心模块写入，这里只写申请侧动作）。 */
function appendApprovalRecord(
  record: Pick<PurchaseRequestRecord, 'id'>,
  action: ApprovalRecord['action'],
  operatorName: string,
  operatorDepartment: string,
  operatorId: string,
): void {
  approvalRecordsMock.push({
    id: `${record.id}-apr-${approvalRecordsMock.length + 1}`,
    businessType: 'purchase_request',
    businessId: record.id,
    action,
    operatorId,
    operatorName,
    department: operatorDepartment,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
}

/** 采购申请审计日志便捷封装（模块固定为采购管理）。 */
function logPurchase(operator: string, action: string, targetSummary: string): void {
  appendLog({ operator, module: 'purchase', action, targetSummary })
}

/** 采购申请接口：编码预取、分页、详情、新建、编辑、删除、提交与撤回。 */
export const purchaseRequestHandlers = [
  http.get('*/api/purchase/request/next-code', async () => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    return ok(nextPurchaseRequestCode())
  }),

  http.get('*/api/purchase/request/page', async ({ request }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const params = parseParams(new URL(request.url))
    return ok(paginate(filterRequests(params), params.current, params.pageSize))
  }),

  http.post('*/api/purchase/request', async ({ request }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const payload = (await request.json()) as Partial<SavePurchaseRequestPayload>
    const payloadError = findPayloadError(payload as SavePurchaseRequestPayload)
    if (payloadError) return payloadError

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = `pr-${dayjs(now).format('MMDDHHmmss')}`
    const items = buildItems(id, payload as SavePurchaseRequestPayload)
    const record: PurchaseRequestRecord = {
      id,
      code: nextPurchaseRequestCode(),
      title: (payload.title ?? '').trim(),
      // 申请人 = 当前登录用户（原型申请人只读，不允许代提）。
      applicantId: session.user.id,
      applicantName: session.user.name,
      department: session.user.department ?? '',
      expectedDate: payload.expectedDate,
      reason: (payload.reason ?? '').trim(),
      totalAmount: calcTotalAmount(items),
      status: 'draft',
      items,
      createdAt: now,
      updatedAt: now,
    }
    purchaseRequestsMock.unshift(record)
    logPurchase(session.user.name, '新建采购申请', `采购申请 ${record.title}（${record.code}）`)
    return ok(record)
  }),

  http.put('*/api/purchase/request/:id', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = purchaseRequestsMock.find((item) => item.id === params.id)
    if (!record) return businessError(REQUEST_NOT_FOUND, '采购申请不存在或已被移除')
    // 仅草稿与已拒绝可改；待审批需先撤回，已通过/已生成订单不可变更。
    if (record.status !== 'draft' && record.status !== 'rejected') {
      return businessError(STATUS_NOT_ALLOWED, '当前状态不允许编辑，请先撤回或联系管理员')
    }
    const payload = (await request.json()) as Partial<SavePurchaseRequestPayload>
    const payloadError = findPayloadError(payload as SavePurchaseRequestPayload)
    if (payloadError) return payloadError

    record.title = (payload.title ?? '').trim()
    record.expectedDate = payload.expectedDate
    record.reason = (payload.reason ?? '').trim()
    // 明细整体替换：行 id 重排，商品快照刷新为商品表当前值。
    record.items = buildItems(record.id, payload as SavePurchaseRequestPayload)
    record.totalAmount = calcTotalAmount(record.items)
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    logPurchase(session.user.name, '编辑采购申请', `采购申请 ${record.title}（${record.code}）`)
    return ok(record)
  }),

  http.delete('*/api/purchase/request/:id', async ({ params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const index = purchaseRequestsMock.findIndex((item) => item.id === params.id)
    if (index === -1) return businessError(REQUEST_NOT_FOUND, '采购申请不存在或已被移除')
    const record = purchaseRequestsMock[index]
    // 仅草稿可物理删除；其余状态留痕，后续用作废代替删除。
    if (record.status !== 'draft') {
      return businessError(STATUS_NOT_ALLOWED, '仅草稿状态的申请可以删除')
    }
    purchaseRequestsMock.splice(index, 1)
    logPurchase(session.user.name, '删除采购申请', `采购申请 ${record.title}（${record.code}）`)
    return ok(null)
  }),

  http.post('*/api/purchase/request/:id/submit', async ({ params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = purchaseRequestsMock.find((item) => item.id === params.id)
    if (!record) return businessError(REQUEST_NOT_FOUND, '采购申请不存在或已被移除')
    // 草稿首次提交；已拒绝的申请重提（修改后重新进入待审批）。
    if (record.status !== 'draft' && record.status !== 'rejected') {
      return businessError(STATUS_NOT_ALLOWED, '当前状态不允许提交审批')
    }
    if (record.items.length === 0) return businessError(ITEMS_INVALID, '请至少添加一条申请明细')

    const isResubmit = record.status === 'rejected'
    record.status = 'pending'
    record.submittedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    record.updatedAt = record.submittedAt
    appendApprovalRecord(
      record,
      isResubmit ? 'resubmit' : 'submit',
      session.user.name,
      session.user.department ?? '',
      session.user.id,
    )
    logPurchase(
      session.user.name,
      isResubmit ? '重新提交采购申请' : '提交采购申请',
      `采购申请 ${record.title}（${record.code}）`,
    )
    return ok(record)
  }),

  http.post('*/api/purchase/request/:id/withdraw', async ({ params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = purchaseRequestsMock.find((item) => item.id === params.id)
    if (!record) return businessError(REQUEST_NOT_FOUND, '采购申请不存在或已被移除')
    // 只有还在待审批的申请可以撤回；审批已结论的单据不可逆。
    if (record.status !== 'pending') {
      return businessError(STATUS_NOT_ALLOWED, '仅待审批状态的申请可以撤回')
    }
    record.status = 'draft'
    record.submittedAt = undefined
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    appendApprovalRecord(record, 'withdraw', session.user.name, session.user.department ?? '', session.user.id)
    logPurchase(session.user.name, '撤回采购申请', `采购申请 ${record.title}（${record.code}）`)
    return ok(record)
  }),

  http.get('*/api/purchase/request/:id', async ({ params }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const record = purchaseRequestsMock.find((item) => item.id === params.id)
    if (!record) return businessError(REQUEST_NOT_FOUND, '采购申请不存在或已被移除')
    // 详情附带审批流水时间线（按时间正序）；审批中心落地后由独立接口提供。
    const approvalRecords = approvalRecordsMock
      .filter((item) => item.businessId === record.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return ok({ ...record, approvalRecords })
  }),
]
