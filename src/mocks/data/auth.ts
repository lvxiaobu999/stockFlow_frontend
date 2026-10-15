import type { AuthSession, CurrentUser } from '@/features/auth/types'
import type { UserRecord } from '@/features/system/types'
import { rolePermissionCodes } from './roles'
import { usersMock } from './users'

/**
 * 认证接口的本地 Mock 数据与会话模拟。
 *
 * 真实后端通过 Cookie 会话识别登录态，浏览器侧的 MSW 读不到 httpOnly Cookie，
 * 因此这里用「模块变量 + sessionStorage」模拟：模块变量等价于服务端会话存储，
 * sessionStorage 负责让会话像 Cookie 一样在页面刷新后仍然存活（标签页关闭即失效）。
 * 会话内容只有用户信息与权限码，不含任何凭证；切换真实接口后本文件可整体删除。
 */

/** 演示环境的统一登录密码：所有 mock 账号共用，避免维护多份口令。 */
export const MOCK_PASSWORD = '123456'

/** 系统默认初始密码：新建用户 / 重置密码时使用（与需求文档约定的格式一致）。 */
export const DEFAULT_INITIAL_PASSWORD = 'Zq@20260920'

/** sessionStorage 中模拟 Cookie 会话的键名。 */
const SESSION_STORAGE_KEY = 'stockflow:mock-session'

/** 从 sessionStorage 恢复会话；引用的用户已不存在（数据被改动）时视为未登录。 */
function readPersistedSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    return parsed.user && usersMock.some((item) => item.id === parsed.user.id) ? parsed : null
  } catch {
    // 存储不可用（如隐私模式被禁用）时退化为纯内存会话。
    return null
  }
}

let mockSession: AuthSession | null = readPersistedSession()

/** 读取当前 mock 会话，等价于后端根据 Cookie 查会话。 */
export function getMockSession(): AuthSession | null {
  return mockSession
}

/** 写入 mock 会话，登录成功时由 handler 调用。 */
export function setMockSession(session: AuthSession): void {
  mockSession = session
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // 存储写入失败不阻断登录，仅失去「刷新后会话存活」的能力。
  }
}

/** 清空 mock 会话，退出登录时由 handler 调用。 */
export function clearMockSession(): void {
  mockSession = null
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // 忽略：内存会话已清空。
  }
}

/** 把用户档案转换成会话中的当前用户投影（角色编码与名称一一对应）。 */
export function toCurrentUser(user: UserRecord): CurrentUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    phone: user.phone,
    email: user.email,
    department: user.department,
    userType: user.userType,
    roles: user.roles.map((role) => role.code),
    roleNames: user.roles.map((role) => role.name),
    lastLoginAt: user.lastLoginAt,
    // Mock 环境没有真实来源 IP，使用固定内网地址供个人中心展示。
    lastLoginIp: '192.168.1.24',
  }
}

/** 汇总用户各角色的权限码；管理员直接持有 '*' 通配。 */
export function resolvePermissions(user: UserRecord): string[] {
  if (user.roles.some((role) => role.code === 'admin')) return ['*']
  const permissions = new Set<string>()
  for (const role of user.roles) {
    for (const code of rolePermissionCodes[role.code] ?? []) {
      permissions.add(code)
    }
  }
  return [...permissions]
}

/** 会话中引用的用户档案必须真实存在；切换用户数据后同步刷新会话，避免悬空引用。 */
export function findSessionUser(user: UserRecord): UserRecord | undefined {
  return usersMock.find((item) => item.id === user.id)
}
