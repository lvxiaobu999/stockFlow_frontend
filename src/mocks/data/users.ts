import dayjs from 'dayjs'
import type { UserRecord } from '@/features/system/types'
import { toRoleBrief } from './roles'

/**
 * 用户 Mock 数据：34 个账号 = 16 名内部员工 + 18 个供应商账号。
 *
 * 数量口径说明：需求原型写「共 28 条」与角色用户数合计（1+4+3+6+2+18=34）矛盾，
 * 这里取 34 保证角色表的用户数、角色详情卡与用户列表三者自洽（详见 docs 偏差记录）。
 */

/** 内部员工种子：与角色种子严格对齐（采购员 4、审批人 3、仓库 6、财务 2、管理员 1）。 */
interface StaffSeed {
  username: string
  name: string
  roleCode: string
  department: string
  /** 省略时默认启用。 */
  status?: 0 | 1
  /** 省略时按序号自动生成递减时间。 */
  lastLoginAt?: string
  builtin?: boolean
}

const staffSeeds: StaffSeed[] = [
  {
    username: 'admin',
    name: '系统管理员',
    roleCode: 'admin',
    department: '信息部',
    builtin: true,
    lastLoginAt: '2026-09-20 14:32:00',
  },
  {
    username: 'zhangwei',
    name: '张伟',
    roleCode: 'purchaser',
    department: '采购部',
    lastLoginAt: '2026-09-20 11:08:00',
  },
  { username: 'linmin', name: '李敏', roleCode: 'purchaser', department: '采购部', lastLoginAt: '2026-09-19 17:42:00' },
  {
    username: 'zhaolei',
    name: '赵磊',
    roleCode: 'purchaser',
    department: '采购部',
    lastLoginAt: '2026-09-19 09:15:00',
  },
  {
    username: 'sunqian',
    name: '孙倩',
    roleCode: 'purchaser',
    department: '采购部',
    lastLoginAt: '2026-09-18 16:27:00',
  },
  {
    username: 'wangfang',
    name: '王芳',
    roleCode: 'approver',
    department: '财务部',
    lastLoginAt: '2026-09-20 09:47:00',
  },
  {
    username: 'qianfeng',
    name: '钱峰',
    roleCode: 'approver',
    department: '运营部',
    lastLoginAt: '2026-09-18 14:03:00',
  },
  { username: 'zhouyu', name: '周宇', roleCode: 'approver', department: '采购部', lastLoginAt: '2026-09-17 10:51:00' },
  {
    username: 'liuyang',
    name: '刘洋',
    roleCode: 'warehouse',
    department: '仓储部',
    lastLoginAt: '2026-09-19 18:20:00',
  },
  { username: 'wujun', name: '吴军', roleCode: 'warehouse', department: '仓储部', lastLoginAt: '2026-09-19 08:36:00' },
  {
    username: 'zhengtao',
    name: '郑涛',
    roleCode: 'warehouse',
    department: '仓储部',
    lastLoginAt: '2026-09-16 15:44:00',
  },
  { username: 'fengyi', name: '冯逸', roleCode: 'warehouse', department: '仓储部', lastLoginAt: '2026-09-15 11:29:00' },
  {
    username: 'xuchuan',
    name: '徐川',
    roleCode: 'warehouse',
    department: '仓储部',
    lastLoginAt: '2026-09-12 17:02:00',
  },
  { username: 'gaofan', name: '高帆', roleCode: 'warehouse', department: '仓储部', lastLoginAt: '2026-09-10 09:58:00' },
  // 陈杰为「停用」演示账号：登录应被拒绝，用于验证停用规则。
  {
    username: 'chenjie',
    name: '陈杰',
    roleCode: 'finance',
    department: '财务部',
    status: 0,
    lastLoginAt: '2026-08-30 10:12:00',
  },
  { username: 'lupei', name: '陆萍', roleCode: 'finance', department: '财务部', lastLoginAt: '2026-09-18 13:21:00' },
]

/** 供应商账号种子：userType=supplier，登录会被引导至供应商门户（本期拦截提示）。 */
const supplierNames = [
  '杭州宏远纸业',
  '上海本墨实业有限公司',
  '青岩包装材料厂',
  '华兴五金制品厂',
  '蓝塑新材料有限公司',
  '天目电子元器件商行',
  '金凯机械设备有限公司',
  '荣达化工原料经营部',
  '明洲纺织品有限公司',
  '康乐办公用品公司',
  '原创智造科技有限公司',
  '百川胶粘制品厂',
  '诚鑫标准件加工厂',
  '南山铝业有限公司',
  '恒基物流设备有限公司',
  '星河线缆制造有限公司',
  '福润纸箱包装厂',
  '泰丰五金交电经营部',
]

/** 按序号生成确定性的 11 位手机号，避免 Mock 数据出现随机值导致快照不稳定。 */
function staffPhone(index: number): string {
  return `138${String(4100 + index).padStart(4, '0')}${String(2200 + index * 7).padStart(4, '0')}`
}

/** 供应商使用固定前缀的手机号，与内部员工区分。 */
function supplierPhone(index: number): string {
  return `139${String(5100 + index).padStart(4, '0')}${String(3600 + index * 11).padStart(4, '0')}`
}

/** 以 2026-09-20 14:30 为基准，按序号递减生成确定的最后登录时间。 */
function fallbackLastLogin(index: number): string {
  return dayjs('2026-09-20 14:30:00')
    .subtract(index * 7, 'hour')
    .format('YYYY-MM-DD HH:mm:ss')
}

function buildUser(index: number, seed: StaffSeed): UserRecord {
  const roleBrief = toRoleBrief(seed.roleCode)
  const createdAt = dayjs('2026-03-01 09:00:00')
    .subtract(index * 3, 'day')
    .format('YYYY-MM-DD HH:mm:ss')
  return {
    id: `user-${String(index + 1).padStart(3, '0')}`,
    username: seed.username,
    name: seed.name,
    phone: staffPhone(index),
    email: `${seed.username}@stockflow.cn`,
    department: seed.department,
    userType: 'staff',
    roles: [roleBrief],
    status: seed.status ?? 1,
    builtin: seed.builtin,
    lastLoginAt: seed.lastLoginAt ?? fallbackLastLogin(index),
    createdAt,
    updatedAt: createdAt,
  }
}

function buildSupplier(index: number, name: string): UserRecord {
  const createdAt = dayjs('2026-04-01 10:00:00')
    .subtract(index * 5, 'day')
    .format('YYYY-MM-DD HH:mm:ss')
  return {
    id: `user-supplier-${String(index + 1).padStart(3, '0')}`,
    // 供应商登录名统一 supplierNN；首个账号在下方覆盖为原型演示账号 hongyuan01。
    username: `supplier${String(index + 1).padStart(2, '0')}`,
    name,
    phone: supplierPhone(index),
    // 供应商账号不分配邮箱与部门，列表部门列展示「—」。
    userType: 'supplier',
    roles: [toRoleBrief('supplier')],
    status: 1,
    lastLoginAt: fallbackLastLogin(index + 20),
    createdAt,
    updatedAt: createdAt,
  }
}

/** 全量用户列表（内存可变数据：handler 的增改直接作用于此数组）。 */
export const usersMock: UserRecord[] = [
  ...staffSeeds.map((seed, index) => buildUser(index, seed)),
  ...supplierNames.map((name, index) => buildSupplier(index, name)),
]

/** 供应商账号的登录用户名（杭州宏远纸业固定为 hongyuan01，与原型一致便于演示）。 */
export const DEMO_SUPPLIER_USERNAME = 'hongyuan01'

// 覆盖第一个供应商的账号信息，保证与原型演示数据一致。
usersMock[staffSeeds.length] = {
  ...usersMock[staffSeeds.length],
  username: DEMO_SUPPLIER_USERNAME,
}

/** 统计某角色的用户数：角色列表「用户数」列与角色详情卡共用，保证与用户数据自洽。 */
export function getRoleUserCount(roleCode: string): number {
  return usersMock.filter((user) => user.roles.some((role) => role.code === roleCode)).length
}

/** 按用户名查找用户（登录校验与账号唯一性检查共用）。 */
export function findUserByUsername(username: string): UserRecord | undefined {
  return usersMock.find((user) => user.username === username)
}

/** 生成下一个用户 id，保持与现有 id 相同的 user-xxx 格式。 */
export function nextUserId(): string {
  return `user-${String(usersMock.length + 1).padStart(3, '0')}`
}
