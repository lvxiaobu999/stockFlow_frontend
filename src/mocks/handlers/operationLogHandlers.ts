import dayjs from 'dayjs'
import { delay, http } from 'msw'
import { getMockSession } from '@/mocks/data/auth'
import { LOG_MODULES, operationLogsMock } from '@/mocks/data/operation-logs'
import { usersMock } from '@/mocks/data/users'
import { paginate } from '@/mocks/pagination'
import { httpError, ok } from '@/mocks/utils'

/** 操作日志接口：只读分页查询与筛选下拉选项，不提供任何写接口。 */
export const operationLogHandlers = [
  http.get('*/system/operation-log/page', async ({ request }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')

    const url = new URL(request.url)
    const operator = url.searchParams.get('operator') ?? undefined
    const module = url.searchParams.get('module') ?? undefined
    const startTime = url.searchParams.get('startTime') ?? undefined
    const endTime = url.searchParams.get('endTime') ?? undefined
    const keyword = url.searchParams.get('keyword')?.trim()

    const filtered = operationLogsMock.filter((log) => {
      if (operator && log.operator !== operator) return false
      if (module && log.module !== module) return false
      // 时间边界用 dayjs 比较，兼容前端传日期（YYYY-MM-DD）或完整时间戳。
      if (startTime && dayjs(log.operatedAt).isBefore(dayjs(startTime).startOf('day'))) return false
      if (endTime && dayjs(log.operatedAt).isAfter(dayjs(endTime).endOf('day'))) return false
      if (keyword && !`${log.targetSummary}${log.action}${log.ip}${log.operator}`.includes(keyword)) return false
      return true
    })

    const current = Number(url.searchParams.get('current') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    return ok(paginate(filtered, current, pageSize))
  }),

  http.get('*/system/operation-log/options', async () => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    // 操作人下拉取内部员工（登录失败记录的「未知账号」不进入选项）。
    const operators = [...new Set(usersMock.filter((user) => user.userType === 'staff').map((user) => user.name))]
    return ok({ operators, modules: LOG_MODULES.map(({ value, label }) => ({ value, label })) })
  }),
]
