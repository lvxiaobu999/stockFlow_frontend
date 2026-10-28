import dayjs from 'dayjs'
import type { SupplierRecord, SupplierRecentOrder } from '@/features/supplier/types'
import type { EnableStatus } from '@/types/common'
import { usersMock } from './users'

/**
 * 供应商 Mock 数据：16 家供应商 = 14 家已开通门户账号 + 2 家未开户。
 *
 * - 门户账号按「供应商名称 ↔ user 表供应商账号的姓名（公司名）」一对一匹配
 *   （真实设计为 user.supplier_id 外键，见 docs 偏差记录）；
 * - 3 家停用供应商；在途订单数由采购订单数据集回写（见 purchaseOrders.ts），
 *   累计采购额为对账 / 付款模块落地前的投影字段。
 */

interface SupplierSeed {
  name: string
  contactPerson: string
  phone: string
  email?: string
  address?: string
  bankName?: string
  bankAccount?: string
  /** false=未在用户管理开户（无门户账号）。 */
  portal: boolean
  /** false=个体工商户，无统一社会信用代码。 */
  hasTaxNo?: boolean
  pendingOrderCount: number
  totalPurchaseAmount: number
  status?: EnableStatus
  remark?: string
}

/** 统一社会信用代码字符集（不含 I/O/S/V/Z 等易混字符），与前端校验规则一致。 */
const USCC_CHARSET = '0123456789ABCDEFGHJKLMNPQRTUWXY'

/** 按序号确定性生成 18 位统一社会信用代码（91+330100 开头为杭州区域口径）。 */
function mockUscc(seq: number): string {
  let tail = ''
  for (let i = 0; i < 8; i += 1) {
    tail += USCC_CHARSET[(seq * 7 + i * 3) % USCC_CHARSET.length]
  }
  // 91 登记管理部门 + 330100 杭州 + MA 组织机构代码段 + 8 位主体码 = 18 位。
  return `91${String(330100 + seq).padStart(6, '0')}MA${tail}`
}

const supplierSeeds: SupplierSeed[] = [
  {
    name: '杭州宏远纸业',
    contactPerson: '周建国',
    phone: '13805712288',
    email: 'zhoujg@hongyuan.cn',
    address: '杭州市拱墅区莫干山路 1188 号',
    bankName: '工商银行杭州拱墅支行',
    bankAccount: '12020201099001234567',
    portal: true,
    hasTaxNo: true,
    pendingOrderCount: 3,
    totalPurchaseAmount: 286540.5,
  },
  {
    name: '上海本墨实业有限公司',
    contactPerson: '吴丽华',
    phone: '13917872345',
    email: 'wulh@benmo.com.cn',
    address: '上海市闵行区春申路 88 号',
    bankName: '建设银行上海闵行支行',
    bankAccount: '31001520380045678901',
    portal: true,
    hasTaxNo: true,
    pendingOrderCount: 2,
    totalPurchaseAmount: 154200,
  },
  {
    name: '青岩包装材料厂',
    contactPerson: '郑国强',
    phone: '0571-88556677',
    address: '湖州市南浔区青岩路 56 号',
    portal: true,
    pendingOrderCount: 4,
    totalPurchaseAmount: 98600,
    remark: '个体工商户，仅支持对私转账',
  },
  {
    name: '华兴五金制品厂',
    contactPerson: '冯春梅',
    phone: '13605713456',
    email: 'fengcm@huaxingwj.com',
    address: '嘉兴市南湖区新兴街道 21 号',
    bankName: '中国银行嘉兴南湖支行',
    bankAccount: '45602130050098765432',
    portal: true,
    hasTaxNo: true,
    pendingOrderCount: 1,
    totalPurchaseAmount: 76450,
  },
  {
    name: '蓝塑新材料有限公司',
    contactPerson: '徐志明',
    phone: '13705817654',
    email: 'xuzm@lansu.cn',
    address: '宁波市镇海区化工园区纬三路 8 号',
    bankName: '交通银行宁波镇海支行',
    bankAccount: '33200678001122334455',
    portal: true,
    hasTaxNo: true,
    pendingOrderCount: 2,
    totalPurchaseAmount: 132780,
  },
  {
    name: '天目电子元器件商行',
    contactPerson: '高翔',
    phone: '13566778899',
    email: 'gaox@tianmu-ec.cn',
    address: '杭州市西湖区天目山路 254 号',
    portal: true,
    pendingOrderCount: 0,
    totalPurchaseAmount: 21900,
  },
  {
    name: '金凯机械设备有限公司',
    contactPerson: '罗永康',
    phone: '13868901234',
    email: 'luoyk@jinkai-mach.com',
    address: '台州市路桥区金凯大道 1 号',
    bankName: '工商银行台州路桥支行',
    bankAccount: '12100220077889900112',
    portal: true,
    hasTaxNo: true,
    pendingOrderCount: 5,
    totalPurchaseAmount: 468200,
    remark: '设备类需提前 15 天订货',
  },
  {
    name: '荣达化工原料经营部',
    contactPerson: '韩雪梅',
    phone: '0571-87778899',
    address: '杭州市钱塘区化工路 19 号',
    portal: true,
    pendingOrderCount: 0,
    totalPurchaseAmount: 45100,
    status: 0,
    remark: '环保整改停业，恢复后启用',
  },
  {
    name: '明洲纺织品有限公司',
    contactPerson: '唐明辉',
    phone: '13905815678',
    email: 'tangmh@mingzhou-tex.com',
    address: '绍兴市柯桥区轻纺城大道 100 号',
    bankName: '浙商银行绍兴柯桥支行',
    bankAccount: '20100012345566778899',
    portal: true,
    hasTaxNo: true,
    pendingOrderCount: 2,
    totalPurchaseAmount: 167300,
  },
  {
    name: '康乐办公用品公司',
    contactPerson: '曹丽萍',
    phone: '13306531234',
    email: 'caolp@kangle-bg.cn',
    address: '杭州市上城区解放东路 58 号',
    bankName: '杭州银行上城支行',
    bankAccount: '70122010990005566778',
    portal: true,
    hasTaxNo: true,
    pendingOrderCount: 1,
    totalPurchaseAmount: 54200,
  },
  {
    name: '原创智造科技有限公司',
    contactPerson: '潘志刚',
    phone: '15868771234',
    email: 'panzg@yuanchuang.tech',
    address: '杭州市滨江区江陵路 88 号研发楼',
    bankName: '宁波银行杭州滨江支行',
    bankAccount: '80122010668800123400',
    portal: true,
    hasTaxNo: true,
    pendingOrderCount: 3,
    totalPurchaseAmount: 321500,
  },
  {
    name: '百川胶粘制品厂',
    contactPerson: '蒋一鸣',
    phone: '0571-87991122',
    address: '嘉兴市海宁市长安镇创业路 12 号',
    portal: true,
    pendingOrderCount: 0,
    totalPurchaseAmount: 18700,
  },
  {
    name: '诚鑫标准件加工厂',
    contactPerson: '邓晓芳',
    phone: '13656788901',
    email: 'dengxf@chengxin-bj.com',
    address: '温州市龙湾区永强大道 232 号',
    bankName: '温州银行龙湾支行',
    bankAccount: '50122010099887766554',
    portal: true,
    hasTaxNo: true,
    pendingOrderCount: 0,
    totalPurchaseAmount: 66300,
    status: 0,
    remark: '迁移厂房，暂停合作',
  },
  {
    name: '南山铝业有限公司',
    contactPerson: '沈国平',
    phone: '13906612345',
    email: 'shengp@nanshan-alu.com',
    address: '佛山市南海区南山大道 9 号',
    bankName: '广发银行佛山南海支行',
    bankAccount: '95508800012345067890',
    portal: true,
    hasTaxNo: true,
    pendingOrderCount: 2,
    totalPurchaseAmount: 238900,
  },
  {
    // 未在用户管理开户的供应商：详情页展示「未开通」门户账号状态。
    name: '恒基物流设备有限公司',
    contactPerson: '卢伟东',
    phone: '13778901234',
    email: 'luwd@hengji-logi.com',
    address: '杭州市余杭区良渚街道博园西路 6 号',
    bankName: '光大银行杭州余杭支行',
    bankAccount: '62266633001122003455',
    portal: false,
    hasTaxNo: true,
    pendingOrderCount: 0,
    totalPurchaseAmount: 18750,
  },
  {
    name: '宏安文具制造厂',
    contactPerson: '邵婷婷',
    phone: '13357118899',
    address: '义乌市国际商贸城二区 32 号街',
    portal: false,
    pendingOrderCount: 0,
    totalPurchaseAmount: 8600,
    status: 0,
    remark: '样品质检未达标，暂停合作',
  },
]

/** 门户账号按公司名匹配用户表；真实实现为 user.supplier_id 外键直查。 */
function derivePortalUsername(name: string): string | undefined {
  return usersMock.find((user) => user.userType === 'supplier' && user.name === name)?.username
}

export const suppliersMock: SupplierRecord[] = supplierSeeds.map((seed, index) => {
  const createdAt = dayjs('2026-04-01 10:00:00')
    .subtract(index * 7, 'day')
    .format('YYYY-MM-DD HH:mm:ss')
  return {
    id: `sup-${String(index + 1).padStart(3, '0')}`,
    code: `SUP${String(index + 1).padStart(4, '0')}`,
    name: seed.name,
    contactPerson: seed.contactPerson,
    phone: seed.phone,
    email: seed.email,
    address: seed.address,
    bankName: seed.bankName,
    bankAccount: seed.bankAccount,
    taxNo: seed.hasTaxNo ? mockUscc(index + 1) : undefined,
    remark: seed.remark,
    status: seed.status ?? 1,
    pendingOrderCount: seed.pendingOrderCount,
    totalPurchaseAmount: seed.totalPurchaseAmount,
    portalUsername: seed.portal ? derivePortalUsername(seed.name) : undefined,
    createdAt,
    updatedAt: createdAt,
  }
})

/** 生成下一个供应商编码：取现有最大流水 + 1（服务端生成口径）。 */
export function nextSupplierCode(): string {
  const maxSeq = suppliersMock.reduce((max, item) => Math.max(max, Number(item.code.slice(3))), 0)
  return `SUP${String(maxSeq + 1).padStart(4, '0')}`
}

/** 近期订单状态池：与采购订单状态字典同口径（详情页演示用）。 */
const RECENT_ORDER_STATUSES: { statusCode: string; statusName: string }[] = [
  { statusCode: 'completed', statusName: '已完成' },
  { statusCode: 'received', statusName: '已收货' },
  { statusCode: 'shipped', statusName: '已发货' },
  { statusCode: 'pending_supplier', statusName: '待供应商确认' },
  { statusCode: 'cancelled', statusName: '已作废' },
]

/**
 * 构建供应商「近 5 笔采购订单」演示数据（采购模块落地后由真实接口替换）。
 * 金额按累计采购额确定性拆分，保证多次请求结果一致。
 */
export function buildRecentOrders(supplier: SupplierRecord): SupplierRecentOrder[] {
  return RECENT_ORDER_STATUSES.map((status, index) => {
    const amount = supplier.totalPurchaseAmount / 8 + index * 1370.5
    return {
      id: `${supplier.id}-order-${index + 1}`,
      orderNo: `PO-2026-03${String(((index + 1) * 7) % 90).padStart(2, '0')}`,
      placedAt: dayjs('2026-09-18 16:00:00')
        .subtract(index * 11, 'day')
        .format('YYYY-MM-DD HH:mm:ss'),
      totalAmount: Math.round(amount * 100) / 100,
      ...status,
    }
  })
}
