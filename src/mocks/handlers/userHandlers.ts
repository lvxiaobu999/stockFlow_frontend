import dayjs from 'dayjs'
import { delay, http } from 'msw'
import { getMockSession } from '@/mocks/data/auth'
import { DEFAULT_INITIAL_PASSWORD } from '@/mocks/data/auth'
import { appendLog } from '@/mocks/data/operation-logs'
import { toRoleBrief } from '@/mocks/data/roles'
import { findUserByUsername, nextUserId, usersMock } from '@/mocks/data/users'
import { appendSystemLog } from '@/mocks/handlers/shared'
import { paginate } from '@/mocks/pagination'
import type {
  CreateUserPayload,
  EnableStatus,
  UpdateUserPayload,
  UserListParams,
  UserRecord,
} from '@/features/system/types'
import { businessError, httpError, ok } from '@/mocks/utils'

/** 解析查询参数为列表过滤条件（MSW 的 URL 参数均为字符串）。 */
function parseParams(url: URL): UserListParams & { pageSize: number } {
  const current = Number(url.searchParams.get('current') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
  const status = url.searchParams.get('status')
  return {
    keyword: url.searchParams.get('keyword') ?? undefined,
    status: status === null || status === '' ? undefined : (Number(status) as EnableStatus),
    roleCode: url.searchParams.get('roleCode') ?? undefined,
    userType: (url.searchParams.get('userType') ?? undefined) as UserListParams['userType'],
    current,
    pageSize,
  }
}

/** 按列表参数过滤用户（keyword 模糊匹配姓名 / 账号 / 手机号）。 */
function filterUsers(params: UserListParams): UserRecord[] {
  const keyword = params.keyword?.trim()
  return usersMock.filter((user) => {
    if (keyword && !`${user.name}${user.username}${user.phone}`.includes(keyword)) return false
    if (params.status !== undefined && user.status !== params.status) return false
    if (params.roleCode && !user.roles.some((role) => role.code === params.roleCode)) return false
    if (params.userType && user.userType !== params.userType) return false
    return true
  })
}

/** 用户管理接口：分页查询、新建、编辑、重置密码与启停。 */
export const userHandlers = [
  http.get('*/system/user/page', async ({ request }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const params = parseParams(new URL(request.url))
    return ok(paginate(filterUsers(params), params.current, params.pageSize))
  }),

  http.post('*/system/user', async ({ request }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const body = (await request.json()) as Partial<CreateUserPayload>
    const operator = getMockSession()!.user.name

    // 登录账号全库唯一，冲突时返回业务码 4002 供表单定位字段。
    if (!body.username || findUserByUsername(body.username)) {
      return businessError(4002, '登录账号已存在')
    }
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const record: UserRecord = {
      id: nextUserId(),
      username: body.username,
      name: body.name ?? '',
      phone: body.phone ?? '',
      email: body.email,
      department: body.department,
      userType: body.userType ?? 'staff',
      // 角色以编码创建，名称取自角色种子数据，保证展示一致。
      roles: (body.roleCodes ?? []).map(toRoleBrief),
      status: body.status ?? 1,
      remark: body.remark,
      createdAt: now,
      updatedAt: now,
    }
    usersMock.unshift(record)
    appendSystemLog(operator, '新建用户', `账号 ${record.username}（${record.name}）`)
    return ok(record)
  }),

  http.put('*/system/user/:id', async ({ request, params }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const record = usersMock.find((user) => user.id === params.id)
    if (!record) return businessError(4004, '用户不存在或已被移除')

    const body = (await request.json()) as Partial<UpdateUserPayload>
    const operator = getMockSession()!.user.name
    // 登录账号创建后不可修改，这里刻意不读取 body.username。
    if (body.name !== undefined) record.name = body.name
    if (body.phone !== undefined) record.phone = body.phone
    if (body.email !== undefined) record.email = body.email
    if (body.department !== undefined) record.department = body.department
    if (body.userType !== undefined) record.userType = body.userType
    if (body.roleCodes !== undefined) {
      record.roles = body.roleCodes.map(toRoleBrief)
    }
    if (body.status !== undefined) record.status = body.status
    if (body.remark !== undefined) record.remark = body.remark
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    appendSystemLog(operator, '编辑用户', `账号 ${record.username}（${record.name}）`)
    return ok(record)
  }),

  http.put('*/system/user/:id/password', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = usersMock.find((user) => user.id === params.id)
    if (!record) return businessError(4004, '用户不存在或已被移除')

    // Mock 不真正存储口令；空 payload 表示重置为系统默认密码 Zq@20260920。
    await request.json().catch(() => null)
    appendSystemLog(session.user.name, '重置密码', `账号 ${record.username}（初始密码 ${DEFAULT_INITIAL_PASSWORD}）`)
    return ok(null)
  }),

  http.put('*/system/user/:id/status', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = usersMock.find((user) => user.id === params.id)
    if (!record) return businessError(4004, '用户不存在或已被移除')

    const body = (await request.json()) as { status?: EnableStatus }
    const nextStatus = body.status ?? (record.status === 1 ? 0 : 1)
    // 内置 admin 不允许停用，前后端双重保护。
    if (record.builtin && nextStatus === 0) {
      return businessError(4004, '内置管理员账号不允许停用')
    }
    record.status = nextStatus
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    appendLog({
      operator: session.user.name,
      module: 'system',
      action: nextStatus === 1 ? '启用用户' : '停用用户',
      targetSummary: `账号 ${record.username}（${record.name}）`,
    })
    return ok(record)
  }),
]
