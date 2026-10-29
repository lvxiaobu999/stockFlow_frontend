import type {
  CloseReconciliationPayload,
  ConfirmReconciliationPayload,
  CreateReconciliationPayload,
  MarkDiffReconciliationPayload,
  ReconciliationListParams,
  ReconciliationPoolParams,
  ReconciliationPoolRecord,
  ReconciliationRecord,
  ReconciliationSummary,
  SubmitReconciliationPayload,
  UpdateReconciliationPayload,
} from '../types'
import type { PaginatedData } from '@/services/httpClient'
import { request } from '@/services/httpClient'

/**
 * 对账管理服务：查询 4（对账单分页 / 详情 / 单据池 / 汇总）+ 动作 5（创建 / 编辑草稿 /
 * 提交 / 确认 / 标记差异 / 关闭）。金额一律由服务端按明细推导，前端不传金额字段；
 * 状态机由动作驱动（draft → pending → confirmed / disputed → closed）。
 *
 * 业务错误码分段 50xx：5001 对账单不存在、5002 状态不允许该操作、5003 期间无效、
 * 5004 可对账单据校验失败、5005 差异信息不完整；通用段沿用 40xx。
 */
export const reconciliationService = {
  /** 分页查询对账单；keyword 匹配对账单号 / 供应商名称，期间筛选为「有交集即命中」。 */
  async getReconciliationPage(
    params: ReconciliationListParams,
    signal?: AbortSignal,
  ): Promise<PaginatedData<ReconciliationRecord>> {
    return request<PaginatedData<ReconciliationRecord>>('/reconciliation/page', { params, signal })
  },

  /** 对账单详情（含明细行与金额五件套）。 */
  async getReconciliationDetail(id: string, signal?: AbortSignal): Promise<ReconciliationRecord> {
    return request<ReconciliationRecord>('/reconciliation/detail', { params: { id }, signal })
  },

  /**
   * 创建对账单：按「供应商 + 对账期间」勾选已收货单据，submit 决定保存草稿或
   * 生成并提交（待确认）。单据校验失败返回 5004，期间无效返回 5003。
   */
  async createReconciliation(payload: CreateReconciliationPayload): Promise<ReconciliationRecord> {
    return request<ReconciliationRecord>('/reconciliation/create', { method: 'POST', data: payload })
  },

  /** 编辑草稿（仅草稿可改，明细整单替换），可顺带 submit 提交。 */
  async updateReconciliation(payload: UpdateReconciliationPayload): Promise<ReconciliationRecord> {
    return request<ReconciliationRecord>('/reconciliation/update', { method: 'POST', data: payload })
  },

  /** 提交草稿：draft → pending。非草稿状态返回 5002。 */
  async submitReconciliation(payload: SubmitReconciliationPayload): Promise<ReconciliationRecord> {
    return request<ReconciliationRecord>('/reconciliation/submit', { method: 'POST', data: payload })
  },

  /** 确认通过：pending / disputed → confirmed（差异视为处理完毕，服务端清除差异标记）。 */
  async confirmReconciliation(payload: ConfirmReconciliationPayload): Promise<ReconciliationRecord> {
    return request<ReconciliationRecord>('/reconciliation/confirm', { method: 'POST', data: payload })
  },

  /**
   * 标记差异：pending / disputed → disputed，可重复标记更新差异信息；
   * 差异说明必填（缺失返回 5005）。
   */
  async markDiffReconciliation(payload: MarkDiffReconciliationPayload): Promise<ReconciliationRecord> {
    return request<ReconciliationRecord>('/reconciliation/mark-diff', { method: 'POST', data: payload })
  },

  /** 关闭对账单：confirmed → closed（关联付款完成或手动关闭，终态）。 */
  async closeReconciliation(payload: CloseReconciliationPayload): Promise<ReconciliationRecord> {
    return request<ReconciliationRecord>('/reconciliation/close', { method: 'POST', data: payload })
  },

  /** 待对账单据池：已收货且未被任何对账单纳入的收货单（含草稿占用的单据）。 */
  async getPendingPool(
    params: ReconciliationPoolParams,
    signal?: AbortSignal,
  ): Promise<PaginatedData<ReconciliationPoolRecord>> {
    return request<PaginatedData<ReconciliationPoolRecord>>('/reconciliation/pending-pool', { params, signal })
  },

  /** 对账汇总看板：四卡指标 + 近期待处理列表，一次取齐。 */
  async getSummary(signal?: AbortSignal): Promise<ReconciliationSummary> {
    return request<ReconciliationSummary>('/reconciliation/summary', { signal })
  },
}
