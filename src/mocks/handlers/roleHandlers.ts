import dayjs from 'dayjs'
import { delay, http } from 'msw'
import { getMockSession } from '@/mocks/data/auth'
import { appendLog } from '@/mocks/data/operation-logs'
import { permissionTreeMock, roleMock, rolePermissionCodes } from '@/mocks/data/roles'
import { getRoleUserCount, usersMock } from '@/mocks/data/users'
import { appendSystemLog } from '@/mocks/handlers/shared'
import { paginate } from '@/mocks/pagination'
import type {
  CreateRolePayload,
  EnableStatus,
  RoleRecord,
  SaveRolePermissionsPayload,
  UpdateRolePayload,
} from '@/features/system/types'
import { businessError, httpError, ok } from '@/mocks/utils'

/** 角色权限的会话期存储：key 为角色编码，初始值为种子权限。 */
const savedRolePermissions = new Map<string, string[]>(Object.entries(rolePermissionCodes))

/** 给角色补充实时用户数，保证与用户数据自洽。 */
function withUserCount(role: RoleRecord): RoleRecord {
  return { ...role, userCount: getRoleUserCount(role.code) }
}

/** 角色管理接口：分页、下拉、增改、启停与权限树配置。 */
export const roleHandlers = [
  http.get('*/api/system/role/page', async ({ request }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const url = new URL(request.url)
    const name = url.searchParams.get('name')?.trim()
    const status = url.searchParams.get('status')
    const filtered = roleMock.filter((role) => {
      if (name && !role.name.includes(name) && !role.code.includes(name)) return false
      if (status !== null && status !== '' && role.status !== Number(status)) return false
      return true
    })
    const current = Number(url.searchParams.get('current') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
    return ok(paginate(filtered.map(withUserCount), current, pageSize))
  }),

  http.get('*/api/system/role/options', async () => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    // 下拉选项只提供启用中的角色；停用角色不能再被新单据与表单引用。
    return ok(roleMock.filter((role) => role.status === 1).map(withUserCount))
  }),

  http.post('*/api/system/role', async ({ request }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const body = (await request.json()) as Partial<CreateRolePayload>

    // 角色编码全库唯一，冲突时返回业务码 4002 供表单定位字段。
    if (!body.code || roleMock.some((role) => role.code === body.code)) {
      return businessError(4002, '角色编码已存在')
    }
    const record: RoleRecord = {
      id: `role-${Date.now()}`,
      code: body.code,
      name: body.name ?? body.code,
      description: body.description,
      userCount: 0,
      status: 1,
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }
    roleMock.push(record)
    appendSystemLog(session.user.name, '新建角色', `角色 ${record.name}（${record.code}）`)
    return ok(withUserCount(record))
  }),

  http.put('*/api/system/role/:id', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = roleMock.find((role) => role.id === params.id)
    if (!record) return businessError(4004, '角色不存在或已被移除')

    const body = (await request.json()) as Partial<UpdateRolePayload>
    const operator = session.user.name
    // 编码创建后不可修改，这里刻意不读取 body.code。
    if (body.name !== undefined) record.name = body.name
    if (body.description !== undefined) record.description = body.description
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    appendSystemLog(operator, '编辑角色', `角色 ${record.name}（${record.code}）`)
    return ok(withUserCount(record))
  }),

  http.put('*/api/system/role/:id/status', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = roleMock.find((role) => role.id === params.id)
    if (!record) return businessError(4004, '角色不存在或已被移除')

    const body = (await request.json()) as { status?: EnableStatus }
    const nextStatus = body.status ?? (record.status === 1 ? 0 : 1)
    // admin / supplier 为系统运行必需的内置角色，不允许停用。
    if (record.builtin && nextStatus === 0) {
      return businessError(4003, '内置角色不允许停用')
    }
    record.status = nextStatus
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    appendLog({
      operator: session.user.name,
      module: 'system',
      action: nextStatus === 1 ? '启用角色' : '停用角色',
      targetSummary: `角色 ${record.name}（${record.code}）`,
    })
    return ok(withUserCount(record))
  }),

  http.get('*/api/system/permission/tree', async () => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    return ok(permissionTreeMock)
  }),

  http.get('*/api/system/role/:id/permissions', async ({ params }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const record = roleMock.find((role) => role.id === params.id)
    if (!record) return businessError(4004, '角色不存在或已被移除')
    return ok(savedRolePermissions.get(record.code) ?? [])
  }),

  http.put('*/api/system/role/:id/permissions', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = roleMock.find((role) => role.id === params.id)
    if (!record) return businessError(4004, '角色不存在或已被移除')

    const body = (await request.json()) as Partial<SaveRolePermissionsPayload>
    // 过滤掉分组伪权限码（group: 前缀），只保存真实菜单码与按钮码。
    const permissionCodes = (body.permissionCodes ?? []).filter((code) => !code.startsWith('group:'))
    savedRolePermissions.set(record.code, permissionCodes)
    appendSystemLog(session.user.name, '配置权限', `角色 ${record.name}（保存后下次登录生效）`)
    return ok(null)
  }),

  http.get('*/api/system/role/:id/users', async ({ params }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const record = roleMock.find((role) => role.id === params.id)
    if (!record) return businessError(4004, '角色不存在或已被移除')
    return ok(usersMock.filter((user) => user.roles.some((role) => role.code === record.code)))
  }),
]
