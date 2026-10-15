import dayjs from 'dayjs'
import { delay, http } from 'msw'
import { clearMockSession, getMockSession, resolvePermissions, setMockSession, toCurrentUser } from '@/mocks/data/auth'
import { MOCK_PASSWORD } from '@/mocks/data/auth'
import { findUserByUsername, usersMock } from '@/mocks/data/users'
import { appendSystemLog } from '@/mocks/handlers/shared'
import type { ChangePasswordPayload, LoginPayload, UpdateProfilePayload } from '@/features/auth/types'
import { httpError, ok } from '@/mocks/utils'

/** 认证相关接口：登录、退出、会话恢复、基本资料与密码修改。 */
export const authHandlers = [
  http.post('*/auth/login', async ({ request }) => {
    await delay(280)
    const body = (await request.json()) as Partial<LoginPayload>
    const username = body.username?.trim() ?? ''
    const user = findUserByUsername(username)

    // 账号或密码任一错误都返回统一文案，避免泄露「账号存在但密码错误」。
    if (!user || body.password !== MOCK_PASSWORD) {
      appendSystemLog(user ? user.name : '未知账号', '登录失败', `${username} · 密码错误`, false)
      return httpError(401, '账号或密码错误')
    }
    // 停用用户不能登录；供应商账号归属供应商门户，从管理端登录时拦截引导。
    if (user.status === 0) {
      appendSystemLog(user.name, '登录失败', `${username} · 账号已停用`, false)
      return httpError(403, '账号已被停用，请联系管理员')
    }
    if (user.userType === 'supplier') {
      appendSystemLog(user.name, '登录失败', `${username} · 供应商账号从管理端登录`, false)
      return httpError(403, '供应商账号请从供应商门户登录')
    }

    // 登录成功：刷新最后登录时间并写入 mock 会话（等价于后端种下登录 Cookie）。
    user.lastLoginAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const session = { user: toCurrentUser(user), permissions: resolvePermissions(user) }
    setMockSession(session)
    appendSystemLog(user.name, '登录', 'Web 端')
    return ok(session)
  }),

  http.post('*/auth/logout', async () => {
    await delay(280)
    const session = getMockSession()
    if (session) {
      appendSystemLog(session.user.name, '退出登录', 'Web 端')
    }
    clearMockSession()
    return ok(null)
  }),

  http.get('*/auth/me', async () => {
    await delay(280)
    const session = getMockSession()
    if (!session) {
      return httpError(401, '登录已过期，请重新登录')
    }
    return ok(session)
  }),

  http.put('*/auth/profile', async ({ request }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')

    const body = (await request.json()) as Partial<UpdateProfilePayload>
    const record = usersMock.find((user) => user.id === session.user.id)
    if (!record) return httpError(401, '登录已过期，请重新登录')

    // 基本资料只允许改这三个字段，账号与角色等由用户管理模块维护。
    record.name = body.name ?? record.name
    record.phone = body.phone ?? record.phone
    record.email = body.email
    const sessionUser = toCurrentUser(record)
    setMockSession({ ...session, user: sessionUser })
    appendSystemLog(record.name, '编辑个人资料', `账号 ${record.username}`)
    return ok(sessionUser)
  }),

  http.put('*/auth/password', async ({ request }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')

    const body = (await request.json()) as Partial<ChangePasswordPayload>
    // Mock 账号口令统一为 MOCK_PASSWORD，旧密码不符时拒绝修改。
    if (body.oldPassword !== MOCK_PASSWORD) {
      return httpError(400, '原密码不正确')
    }
    appendSystemLog(session.user.name, '修改密码', `账号 ${session.user.username}`)
    return ok(null)
  }),
]
