import dayjs from 'dayjs'
import type { OperationLogRecord } from '@/features/system/types'

/**
 * 操作日志 Mock 数据：预生成 156 条确定性记录（与原型数量一致），
 * 另提供 appendLog 供各 handler 在登录、用户/角色变更时追加实时日志。
 * 生成逻辑使用固定基准时间与取模轮换，保证多次启动数据稳定、便于联调。
 */

/** 日志模块字典：options 下拉与日志记录共用，value 为模块编码。 */
export const LOG_MODULES = [
  { value: 'system', label: '系统管理' },
  { value: 'product', label: '商品管理' },
  { value: 'supplier', label: '供应商管理' },
  { value: 'inventory', label: '仓库管理' },
  { value: 'purchase', label: '采购管理' },
  { value: 'approval', label: '审批中心' },
  { value: 'receiving', label: '收货与验收' },
  { value: 'reconciliation', label: '对账管理' },
  { value: 'supplier-portal', label: '供应商门户' },
] as const

/** 生成记录用的动作池：module 编码 / 动作名 / 对象摘要模板。 */
const ACTION_POOL: { module: string; action: string; targets: string[] }[] = [
  { module: 'system', action: '登录', targets: ['Web 端'] },
  { module: 'system', action: '登录失败', targets: ['test01 · 密码错误 3 次', 'test02 · 账号不存在'] },
  { module: 'system', action: '新建用户', targets: ['账号 zhangwei（张伟）', '账号 gaofan（高帆）'] },
  { module: 'system', action: '编辑用户', targets: ['账号 lupei（陆萍）', '账号 wujun（吴军）'] },
  { module: 'system', action: '重置密码', targets: ['账号 fengyi（冯逸）', '账号 xuchuan（徐川）'] },
  { module: 'system', action: '停用用户', targets: ['账号 chenjie（陈杰）'] },
  { module: 'system', action: '启用用户', targets: ['账号 chenjie（陈杰）'] },
  { module: 'system', action: '配置权限', targets: ['角色 采购员', '角色 仓库人员'] },
  { module: 'purchase', action: '提交采购申请', targets: ['采购申请 PR-2026-0912', '采购申请 PR-2026-0908'] },
  { module: 'purchase', action: '生成采购订单', targets: ['采购订单 PO-2026-0308'] },
  { module: 'purchase', action: '发送供应商', targets: ['采购订单 PO-2026-0306'] },
  { module: 'approval', action: '审批通过', targets: ['采购申请 PR-2026-0901'] },
  { module: 'approval', action: '审批拒绝', targets: ['采购申请 PR-2026-0896'] },
  { module: 'receiving', action: '确认收货', targets: ['收货单 RC-2026-0119'] },
  { module: 'receiving', action: '确认验收', targets: ['验收单 QC-2026-0110'] },
  { module: 'supplier-portal', action: '确认订单', targets: ['采购订单 PO-2026-0301'] },
  { module: 'supplier-portal', action: '创建发货单', targets: ['发货单 SH-2026-0125'] },
]

/** 参与日志轮换的操作人（内部员工姓名）。 */
const OPERATORS = ['系统管理员', '张伟', '李敏', '赵磊', '孙倩', '王芳', '钱峰', '周宇', '刘洋', '吴军', '陆萍']

/** 确定性生成 192.168.x.y 形式的内网 IP。 */
function mockIp(seq: number): string {
  return `192.168.${seq % 8}.${((seq * 13) % 240) + 10}`
}

/** 日志总数：与原型保持一致，测试也会校验该常量。 */
export const OPERATION_LOG_TOTAL = 156

function buildLog(seq: number): OperationLogRecord {
  const template = ACTION_POOL[seq % ACTION_POOL.length]
  const isFailedLogin = template.action === '登录失败'
  return {
    id: `log-${String(seq + 1).padStart(3, '0')}`,
    // 以固定基准时间按 37 分钟步长递减，新记录排在最前。
    operatedAt: dayjs('2026-09-20 14:30:00')
      .subtract(seq * 37, 'minute')
      .format('YYYY-MM-DD HH:mm:ss'),
    // 登录失败可能是未知账号，其余动作的操作人从员工池轮换。
    operator: isFailedLogin && seq % 2 === 0 ? '未知账号' : OPERATORS[seq % OPERATORS.length],
    module: template.module,
    moduleName: LOG_MODULES.find((item) => item.value === template.module)?.label ?? template.module,
    action: template.action,
    targetSummary: template.targets[seq % template.targets.length],
    ip: mockIp(seq),
    success: !isFailedLogin,
  }
}

/** 全量日志（内存可变数据：appendLog 与后续业务 handler 直接作用于该数组）。 */
export const operationLogsMock: OperationLogRecord[] = Array.from({ length: OPERATION_LOG_TOTAL }, (_, seq) =>
  buildLog(seq),
)

/** 追加日志的入参：时间、id 与 IP 由 mock 层自动补全。 */
export interface AppendLogInput {
  operator: string
  module: string
  action: string
  targetSummary: string
  /** 省略时视为成功。 */
  success?: boolean
}

/** 在日志列表头部插入一条实时记录（登录、用户/角色变更时调用）。 */
export function appendLog(input: AppendLogInput): void {
  operationLogsMock.unshift({
    id: `log-${Date.now()}`,
    operatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    operator: input.operator,
    module: input.module,
    moduleName: LOG_MODULES.find((item) => item.value === input.module)?.label ?? input.module,
    action: input.action,
    targetSummary: input.targetSummary,
    ip: '192.168.1.24',
    success: input.success ?? true,
  })
}
