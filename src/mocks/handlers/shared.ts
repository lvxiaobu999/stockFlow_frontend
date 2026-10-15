import { appendLog } from '@/mocks/data/operation-logs'

/**
 * handler 共用的审计日志便捷封装。
 *
 * 登录与用户/角色管理动作统一挂在「系统管理」模块下；业务模块的动作
 * 在各自 handler 里直接调用 appendLog 并传入对应 module。
 */
export function appendSystemLog(operator: string, action: string, targetSummary: string, success = true): void {
  appendLog({ operator, module: 'system', action, targetSummary, success })
}
