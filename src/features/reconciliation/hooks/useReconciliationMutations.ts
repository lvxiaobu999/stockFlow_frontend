import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reconciliationService } from '../services/reconciliationService'
import { reconciliationQueryKeys } from './useReconciliationQueries'
import type {
  CloseReconciliationPayload,
  ConfirmReconciliationPayload,
  CreateReconciliationPayload,
  MarkDiffReconciliationPayload,
  SubmitReconciliationPayload,
  UpdateReconciliationPayload,
} from '../types'

/**
 * 对账写动作：创建 / 编辑草稿 / 提交 / 确认 / 标记差异 / 关闭。
 * 全部动作只影响对账域自身（单据池由对账单引用关系推导），统一整体失效
 * 对账域查询（列表、详情、单据池、汇总看板四侧即时刷新）。
 */
export function useReconciliationMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: reconciliationQueryKeys.all })
  }

  /** 创建对账单：保存草稿或生成并提交（由 payload.submit 决定）。 */
  const createReconciliation = useMutation({
    mutationFn: (payload: CreateReconciliationPayload) => reconciliationService.createReconciliation(payload),
    onSuccess: invalidate,
  })

  /** 编辑草稿：整单替换期间与明细勾选，可顺带提交。 */
  const updateReconciliation = useMutation({
    mutationFn: (payload: UpdateReconciliationPayload) => reconciliationService.updateReconciliation(payload),
    onSuccess: invalidate,
  })

  /** 提交草稿：draft → pending。 */
  const submitReconciliation = useMutation({
    mutationFn: (payload: SubmitReconciliationPayload) => reconciliationService.submitReconciliation(payload),
    onSuccess: invalidate,
  })

  /** 确认通过：pending / disputed → confirmed。 */
  const confirmReconciliation = useMutation({
    mutationFn: (payload: ConfirmReconciliationPayload) => reconciliationService.confirmReconciliation(payload),
    onSuccess: invalidate,
  })

  /** 标记差异：pending / disputed → disputed（可重复标记更新差异信息）。 */
  const markDiffReconciliation = useMutation({
    mutationFn: (payload: MarkDiffReconciliationPayload) => reconciliationService.markDiffReconciliation(payload),
    onSuccess: invalidate,
  })

  /** 关闭对账单：confirmed → closed（终态）。 */
  const closeReconciliation = useMutation({
    mutationFn: (payload: CloseReconciliationPayload) => reconciliationService.closeReconciliation(payload),
    onSuccess: invalidate,
  })

  return {
    createReconciliation,
    updateReconciliation,
    submitReconciliation,
    confirmReconciliation,
    markDiffReconciliation,
    closeReconciliation,
  }
}
