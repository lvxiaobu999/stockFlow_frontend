import dayjs from 'dayjs'
import { delay, http } from 'msw'
import type {
  ApprovalConclusion,
  ApprovalDecisionPayload,
  ApprovalProcessedListParams,
  ApprovalProcessedRecord,
  ApprovalRecord,
  ApprovalTask,
  ApprovalTaskListParams,
} from '@/features/approval/types'
import type { PurchaseRequestRecord } from '@/features/purchase/types'
import { getMockSession } from '@/mocks/data/auth'
import { appendLog } from '@/mocks/data/operation-logs'
import { approvalRecordsMock, purchaseRequestsMock } from '@/mocks/data/purchaseRequests'
import { paginate } from '@/mocks/pagination'
import { businessError, httpError, ok } from '@/mocks/utils'

/** 审批中心错误码：4501 单据不存在（与采购申请共用分段）、4502 已被处理（先到先审兜底）。 */
const APPROVAL_TARGET_NOT_FOUND = 4501
const ALREADY_PROCESSED = 4502
/** 拒绝意见缺失走通用参数错误码（与采购申请保存校验同段）。 */
const COMMENT_REQUIRED = 4001

/** 待审批任务投影：只暴露审批人需要看的字段，明细在详情页查看。 */
function toTask(record: PurchaseRequestRecord): ApprovalTask {
  return {
    id: record.id,
    code: record.code,
    title: record.title,
    applicantId: record.applicantId,
    applicantName: record.applicantName,
    department: record.department,
    totalAmount: record.totalAmount,
    // 审批中心只收已提交的单据，submittedAt 必有。
    submittedAt: record.submittedAt ?? record.createdAt,
  }
}

/** 按列表参数过滤待审批任务：keyword 匹配编号 / 主题，时间范围匹配提交时间。 */
function filterTasks(params: ApprovalTaskListParams): ApprovalTask[] {
  const keyword = params.keyword?.trim()
  return (
    purchaseRequestsMock
      .filter((record) => record.status === 'pending')
      .map(toTask)
      .filter((task) => {
        if (keyword && !`${task.code}${task.title}`.includes(keyword)) return false
        if (params.applicantId && task.applicantId !== params.applicantId) return false
        if (params.submittedFrom || params.submittedTo) {
          const submittedDate = task.submittedAt.slice(0, 10)
          if (params.submittedFrom && submittedDate < params.submittedFrom) return false
          if (params.submittedTo && submittedDate > params.submittedTo) return false
        }
        return true
      })
      // 先到先审：待办按提交时间升序，最早提交的排最前。
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  )
}

/** 当前登录用户名下的结论流水（我的审批 = 本人出具结论的单据）。 */
function findMyConclusions(operatorId: string): Array<{ record: ApprovalRecord; request: PurchaseRequestRecord }> {
  return approvalRecordsMock
    .filter((item) => item.operatorId === operatorId && (item.action === 'approve' || item.action === 'reject'))
    .flatMap((record) => {
      const request = purchaseRequestsMock.find((candidate) => candidate.id === record.businessId)
      // 单据可能已被删除（仅草稿可删，结论必然存在），防御性跳过。
      return request ? [{ record, request }] : []
    })
}

/** 追加结论流水（approve / reject 由审批中心写入，操作人 = 当前登录审批人）。 */
function appendConclusionRecord(
  request: Pick<PurchaseRequestRecord, 'id'>,
  action: ApprovalConclusion,
  operatorName: string,
  operatorDepartment: string,
  operatorId: string,
  comment?: string,
): void {
  approvalRecordsMock.push({
    id: `${request.id}-apr-${approvalRecordsMock.length + 1}`,
    businessType: 'purchase_request',
    businessId: request.id,
    action,
    operatorId,
    operatorName,
    department: operatorDepartment,
    comment,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  })
}

/** 审批审计日志便捷封装（模块固定为审批中心）。 */
function logApproval(operator: string, action: string, targetSummary: string): void {
  appendLog({ operator, module: 'approval', action, targetSummary })
}

/** 审批中心接口：待办分页、已办分页、待办计数、通过与拒绝（先到先审）。 */
export const approvalHandlers = [
  http.get('*/api/approval/pending-page', async ({ request }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const url = new URL(request.url)
    const params: ApprovalTaskListParams & { pageSize: number } = {
      keyword: url.searchParams.get('keyword') ?? undefined,
      applicantId: url.searchParams.get('applicantId') ?? undefined,
      submittedFrom: url.searchParams.get('submittedFrom') ?? undefined,
      submittedTo: url.searchParams.get('submittedTo') ?? undefined,
      current: Number(url.searchParams.get('current') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '20'),
    }
    return ok(paginate(filterTasks(params), params.current, params.pageSize))
  }),

  http.get('*/api/approval/processed-page', async ({ request }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const params: ApprovalProcessedListParams & { pageSize: number } = {
      keyword: url.searchParams.get('keyword') ?? undefined,
      action: (action || undefined) as ApprovalConclusion | undefined,
      processedFrom: url.searchParams.get('processedFrom') ?? undefined,
      processedTo: url.searchParams.get('processedTo') ?? undefined,
      current: Number(url.searchParams.get('current') ?? '1'),
      pageSize: Number(url.searchParams.get('pageSize') ?? '20'),
    }
    const keyword = params.keyword?.trim()
    const rows: ApprovalProcessedRecord[] = findMyConclusions(session.user.id)
      .map(({ record, request: target }) => ({
        id: record.id,
        businessId: record.businessId,
        code: target.code,
        title: target.title,
        applicantName: target.applicantName,
        department: target.department,
        totalAmount: target.totalAmount,
        action: record.action as ApprovalConclusion,
        comment: record.comment,
        createdAt: record.createdAt,
      }))
      .filter((row) => {
        if (keyword && !`${row.code}${row.title}`.includes(keyword)) return false
        if (params.action && row.action !== params.action) return false
        if (params.processedFrom || params.processedTo) {
          const date = row.createdAt.slice(0, 10)
          if (params.processedFrom && date < params.processedFrom) return false
          if (params.processedTo && date > params.processedTo) return false
        }
        return true
      })
      // 最近处理的排最前，方便回看。
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return ok(paginate(rows, params.current, params.pageSize))
  }),

  http.get('*/api/approval/pending-count', async () => {
    // 徽标数据要常驻轮询友，延迟刻意压短。
    await delay(120)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    return ok(purchaseRequestsMock.filter((record) => record.status === 'pending').length)
  }),

  http.post('*/api/purchase/request/:id/approve', async ({ request: httpRequest, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = purchaseRequestsMock.find((item) => item.id === params.id)
    if (!record) return businessError(APPROVAL_TARGET_NOT_FOUND, '采购申请不存在或已被移除')
    // 先到先审：只有仍处待审批的单据可以出具结论，其余一律提示已被处理。
    if (record.status !== 'pending') {
      return businessError(ALREADY_PROCESSED, '该单据已被处理，请刷新列表查看最新状态')
    }
    const { comment } = (await httpRequest.json()) as ApprovalDecisionPayload
    const trimmed = comment?.trim() || undefined
    record.status = 'approved'
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    appendConclusionRecord(
      record,
      'approve',
      session.user.name,
      session.user.department ?? '',
      session.user.id,
      trimmed,
    )
    logApproval(session.user.name, '审批通过', `采购申请 ${record.title}（${record.code}）`)
    return ok(record)
  }),

  http.post('*/api/purchase/request/:id/reject', async ({ request: httpRequest, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = purchaseRequestsMock.find((item) => item.id === params.id)
    if (!record) return businessError(APPROVAL_TARGET_NOT_FOUND, '采购申请不存在或已被移除')
    if (record.status !== 'pending') {
      return businessError(ALREADY_PROCESSED, '该单据已被处理，请刷新列表查看最新状态')
    }
    const { comment } = (await httpRequest.json()) as ApprovalDecisionPayload
    // 需求口径：拒绝必须说明原因，便于申请人修改重提。
    const trimmed = comment?.trim()
    if (!trimmed) return businessError(COMMENT_REQUIRED, '拒绝时必须填写审批意见')
    record.status = 'rejected'
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    appendConclusionRecord(record, 'reject', session.user.name, session.user.department ?? '', session.user.id, trimmed)
    logApproval(session.user.name, '审批拒绝', `采购申请 ${record.title}（${record.code}）`)
    return ok(record)
  }),
]
