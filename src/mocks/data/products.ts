import dayjs from 'dayjs'
import type { ProductRecord, ProductUnit } from '@/features/product/types'
import type { EnableStatus } from '@/types/common'

/**
 * 商品 Mock 数据：30 条商品档案，覆盖 10 个分类、5 种计量单位。
 *
 * - 8 条 totalStock < safetyStock 的预警商品（红色行 + 预警标签的演示数据）；
 * - 3 条停用商品；编码 SP-YYYYMMDD-NNNN（按建档日期 + 全局流水）。
 * totalStock 为「当前总库存」投影字段，种子值与库存推导一致，
 * 库存变更后由库存模块 syncInventoryProjections 按流水实时回写。
 */

interface ProductSeed {
  name: string
  spec: string
  unit: ProductUnit
  categoryId: string
  purchasePrice: number
  salePrice?: number
  safetyStock: number
  totalStock: number
  status?: EnableStatus
  description?: string
}

const productSeeds: ProductSeed[] = [
  // ── 复印纸（cat-010101）─────────────────────────────────────────────
  {
    name: '珊瑚海复印纸 A4 70g',
    spec: '500张/包×8包/箱',
    unit: '箱',
    categoryId: 'cat-010101',
    purchasePrice: 128,
    salePrice: 139,
    safetyStock: 20,
    totalStock: 86,
  },
  {
    name: '晨光复印纸 A4 80g',
    spec: '500张/包×5包/箱',
    unit: '箱',
    categoryId: 'cat-010101',
    purchasePrice: 105.5,
    salePrice: 118,
    safetyStock: 15,
    totalStock: 42,
  },
  {
    name: '红双喜复印纸 A3 70g',
    spec: '500张/包×4包/箱',
    unit: '箱',
    categoryId: 'cat-010101',
    purchasePrice: 138,
    safetyStock: 10,
    totalStock: 8,
  },
  {
    name: '绿州复印纸 B5 70g',
    spec: '500张/包×8包/箱',
    unit: '箱',
    categoryId: 'cat-010101',
    purchasePrice: 112,
    safetyStock: 30,
    totalStock: 120,
    status: 0,
    description: '老包装库存，售完不再采购',
  },
  // ── 打印纸（cat-010102）─────────────────────────────────────────────
  {
    name: '得力热敏打印纸 57×50',
    spec: '3卷/提',
    unit: '提',
    categoryId: 'cat-010102',
    purchasePrice: 12.8,
    salePrice: 15,
    safetyStock: 50,
    totalStock: 210,
  },
  {
    name: '佳宣针式打印纸 三联',
    spec: '1000页/箱',
    unit: '箱',
    categoryId: 'cat-010102',
    purchasePrice: 68,
    safetyStock: 10,
    totalStock: 6,
  },
  // ── 书写工具（cat-010201）───────────────────────────────────────────
  {
    name: '晨光 AGP89701 中性笔 0.5 黑',
    spec: '0.5mm/12支/盒',
    unit: '盒',
    categoryId: 'cat-010201',
    purchasePrice: 18.9,
    salePrice: 22,
    safetyStock: 40,
    totalStock: 156,
  },
  {
    name: '得力 S01 圆珠笔 蓝',
    spec: '0.7mm/20支/盒',
    unit: '盒',
    categoryId: 'cat-010201',
    purchasePrice: 12.5,
    safetyStock: 30,
    totalStock: 88,
  },
  {
    name: '中华 6700 铅笔 HB',
    spec: 'HB/12支/盒',
    unit: '盒',
    categoryId: 'cat-010201',
    purchasePrice: 9.6,
    salePrice: 11,
    safetyStock: 25,
    totalStock: 64,
  },
  {
    name: '百乐 P500 签字笔 0.5 黑',
    spec: '0.5mm/10支/盒',
    unit: '盒',
    categoryId: 'cat-010201',
    purchasePrice: 45,
    salePrice: 52,
    safetyStock: 15,
    totalStock: 12,
  },
  // ── 硒鼓（cat-010301）───────────────────────────────────────────────
  {
    name: '惠普 88A 硒鼓（兼容）',
    spec: '1500页/支',
    unit: '个',
    categoryId: 'cat-010301',
    purchasePrice: 89,
    salePrice: 99,
    safetyStock: 20,
    totalStock: 45,
  },
  {
    name: '惠普 88A 硒鼓（原装）',
    spec: '1500页/支',
    unit: '个',
    categoryId: 'cat-010301',
    purchasePrice: 249,
    safetyStock: 10,
    totalStock: 22,
  },
  {
    name: '兄弟 TN-1035 粉盒',
    spec: '1500页/支',
    unit: '个',
    categoryId: 'cat-010301',
    purchasePrice: 129,
    salePrice: 145,
    safetyStock: 12,
    totalStock: 9,
  },
  {
    name: '佳能 CRG-047 粉盒',
    spec: '1700页/支',
    unit: '个',
    categoryId: 'cat-010301',
    purchasePrice: 159,
    safetyStock: 8,
    totalStock: 31,
    status: 0,
    description: '机型停产，消化库存',
  },
  // ── 电脑整机（cat-020100）───────────────────────────────────────────
  {
    name: '联想扬天 M4000q 台式机',
    spec: 'i5/16G/512G',
    unit: '个',
    categoryId: 'cat-020100',
    purchasePrice: 4599,
    salePrice: 4999,
    safetyStock: 5,
    totalStock: 18,
  },
  {
    name: '戴尔成就 3710 台式机',
    spec: 'i7/16G/1T',
    unit: '个',
    categoryId: 'cat-020100',
    purchasePrice: 6599,
    safetyStock: 3,
    totalStock: 7,
  },
  {
    name: '华为 MateBook D14',
    spec: 'i5/16G/512G/14英寸',
    unit: '个',
    categoryId: 'cat-020100',
    purchasePrice: 5099,
    salePrice: 5399,
    safetyStock: 4,
    totalStock: 2,
  },
  {
    name: '联想小新 Pro16',
    spec: 'R7/16G/512G/16英寸',
    unit: '个',
    categoryId: 'cat-020100',
    purchasePrice: 5499,
    safetyStock: 4,
    totalStock: 11,
  },
  // ── 电脑配件（cat-020200）───────────────────────────────────────────
  {
    name: '绿联九合一扩展坞',
    spec: 'Type-C/100W',
    unit: '个',
    categoryId: 'cat-020200',
    purchasePrice: 199,
    salePrice: 229,
    safetyStock: 10,
    totalStock: 26,
  },
  {
    name: '毕亚雷 Type-C 转接头',
    spec: 'PD 60W',
    unit: '个',
    categoryId: 'cat-020200',
    purchasePrice: 39,
    safetyStock: 30,
    totalStock: 74,
  },
  // ── 键鼠套装（cat-020201）───────────────────────────────────────────
  {
    name: '罗技 MK295 静音键鼠套装',
    spec: '无线/灰色',
    unit: '套',
    categoryId: 'cat-020201',
    purchasePrice: 129,
    salePrice: 149,
    safetyStock: 20,
    totalStock: 55,
  },
  {
    name: '双飞燕 KV300 键鼠套装',
    spec: '有线/防水',
    unit: '套',
    categoryId: 'cat-020201',
    purchasePrice: 89,
    safetyStock: 15,
    totalStock: 3,
  },
  // ── 清洁用品（cat-030100）───────────────────────────────────────────
  {
    name: '蓝月亮洗洁精 1kg',
    spec: '1kg×12瓶/箱',
    unit: '箱',
    categoryId: 'cat-030100',
    purchasePrice: 96,
    safetyStock: 8,
    totalStock: 20,
  },
  {
    name: '维达商用擦手纸',
    spec: '200张×6卷/提',
    unit: '提',
    categoryId: 'cat-030100',
    purchasePrice: 32.5,
    salePrice: 36,
    safetyStock: 40,
    totalStock: 130,
  },
  {
    name: '84 消毒液 5L',
    spec: '5L/桶',
    unit: '个',
    categoryId: 'cat-030100',
    purchasePrice: 18.8,
    safetyStock: 15,
    totalStock: 40,
  },
  {
    name: '3M 思高百洁布',
    spec: '3片装',
    unit: '个',
    categoryId: 'cat-030100',
    purchasePrice: 8.9,
    salePrice: 10.5,
    safetyStock: 50,
    totalStock: 18,
  },
  // ── 办公桌椅（cat-040100）───────────────────────────────────────────
  {
    name: '西昊人体工学椅 M57',
    spec: '黑色/可躺',
    unit: '个',
    categoryId: 'cat-040100',
    purchasePrice: 899,
    salePrice: 999,
    safetyStock: 6,
    totalStock: 14,
  },
  {
    name: '奥卡姆拉升降桌 1.4m',
    spec: '1.4m/白',
    unit: '个',
    categoryId: 'cat-040100',
    purchasePrice: 1699,
    safetyStock: 4,
    totalStock: 2,
  },
  {
    name: '培林办公折叠椅',
    spec: '承重150kg/黑',
    unit: '个',
    categoryId: 'cat-040100',
    purchasePrice: 69,
    salePrice: 79,
    safetyStock: 30,
    totalStock: 95,
    status: 0,
    description: '线下渠道专供，线上停售',
  },
  // ── 储物设备（cat-040200）───────────────────────────────────────────
  {
    name: '震海文件柜 钢制5层',
    spec: '900×450×1800mm',
    unit: '个',
    categoryId: 'cat-040200',
    purchasePrice: 329,
    safetyStock: 5,
    totalStock: 9,
  },
]

export const productsMock: ProductRecord[] = productSeeds.map((seed, index) => {
  // 以 2026-09-01 为基准按 3 天步长递减，index 越小建档越晚（与用户数据同口径）。
  const createdAt = dayjs('2026-09-01 10:00:00')
    .subtract(index * 3, 'day')
    .format('YYYY-MM-DD HH:mm:ss')
  return {
    id: `prod-${String(index + 1).padStart(3, '0')}`,
    // 编码日期段取建档日期，流水为全局递增，保证唯一。
    code: `SP-${dayjs(createdAt).format('YYYYMMDD')}-${String(index + 1).padStart(4, '0')}`,
    ...seed,
    status: seed.status ?? 1,
    createdAt,
    updatedAt: createdAt,
  }
})

/** 生成下一个商品编码：取现有最大流水 + 1，日期段为当天（服务端生成口径）。 */
export function nextProductCode(): string {
  const maxSeq = productsMock.reduce((max, item) => Math.max(max, Number(item.code.slice(-4))), 0)
  return `SP-${dayjs().format('YYYYMMDD')}-${String(maxSeq + 1).padStart(4, '0')}`
}

/** 按名称查找商品（防止重复新建等场景使用）。 */
export function findProductByName(name: string): ProductRecord | undefined {
  return productsMock.find((item) => item.name === name)
}

/** 按 id 查找商品（采购明细等单据引用校验使用）。 */
export function findProductById(id: string): ProductRecord | undefined {
  return productsMock.find((item) => item.id === id)
}
