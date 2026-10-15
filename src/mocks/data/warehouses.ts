import type { WarehouseRecord } from '@/features/inventory/types'
import { usersMock } from './users'

/**
 * 仓库 Mock 数据：MVP 预置 5 仓（总仓/上海/北京/广州/深圳，与需求一致）。
 *
 * - 总仓 isHeadquarters：蓝色 tag 展示且不可停用；
 * - 深圳仓为停用演示：负责人待分配、库存统计为 0；
 * - 库存统计三列为库存模块落地前的投影字段。
 */

interface WarehouseSeed {
  code: string
  name: string
  /** 内部员工账号，用于查 ownerUserId；缺省=待分配。 */
  ownerUsername?: string
  phone?: string
  address?: string
  remark?: string
  status?: 0 | 1
  isHeadquarters?: boolean
  stockSkuCount: number
  stockQuantity: number
  stockAmount: number
  updatedAt: string
}

const warehouseSeeds: WarehouseSeed[] = [
  {
    code: 'WH001',
    name: '总仓',
    ownerUsername: 'liuyang',
    phone: '0571-88123456',
    address: '杭州市余杭区仓储路 1 号',
    isHeadquarters: true,
    stockSkuCount: 68,
    stockQuantity: 4820,
    stockAmount: 356280.55,
    updatedAt: '2026-09-20 09:30:00',
  },
  {
    code: 'WH002',
    name: '上海仓',
    ownerUsername: 'wujun',
    phone: '021-56881234',
    address: '上海市青浦区华新镇嘉松中路 1588 号',
    stockSkuCount: 41,
    stockQuantity: 2210,
    stockAmount: 158640,
    updatedAt: '2026-09-19 17:05:00',
  },
  {
    code: 'WH003',
    name: '北京仓',
    ownerUsername: 'zhengtao',
    phone: '010-66881234',
    address: '北京市大兴区亦庄经济开发区科创十四街 6 号',
    stockSkuCount: 33,
    stockQuantity: 1655,
    stockAmount: 112930.2,
    updatedAt: '2026-09-18 11:40:00',
  },
  {
    code: 'WH004',
    name: '广州仓',
    ownerUsername: 'fengyi',
    phone: '020-38881234',
    address: '广州市黄埔区开源大道 188 号',
    stockSkuCount: 27,
    stockQuantity: 980,
    stockAmount: 66410.8,
    updatedAt: '2026-09-15 15:22:00',
  },
  {
    code: 'WH005',
    name: '深圳仓',
    address: '深圳市龙岗区坪地街道盐龙大道 66 号',
    status: 0,
    remark: '筹备中，启用前需分配负责人',
    stockSkuCount: 0,
    stockQuantity: 0,
    stockAmount: 0,
    updatedAt: '2026-08-28 10:12:00',
  },
]

/** 按账号回填负责人 id；员工数据与用户模块共用同一数据源。 */
function resolveOwnerUserId(ownerUsername?: string): string | undefined {
  if (!ownerUsername) return undefined
  return usersMock.find((user) => user.username === ownerUsername)?.id
}

export const warehousesMock: WarehouseRecord[] = warehouseSeeds.map((seed, index) => ({
  id: `wh-${String(index + 1).padStart(3, '0')}`,
  code: seed.code,
  name: seed.name,
  ownerUserId: resolveOwnerUserId(seed.ownerUsername),
  phone: seed.phone,
  address: seed.address,
  remark: seed.remark,
  status: seed.status ?? 1,
  isHeadquarters: seed.isHeadquarters,
  stockSkuCount: seed.stockSkuCount,
  stockQuantity: seed.stockQuantity,
  stockAmount: seed.stockAmount,
  updatedAt: seed.updatedAt,
}))

/** 生成下一个仓库编码：取现有最大流水 + 1（服务端生成口径）。 */
export function nextWarehouseCode(): string {
  const maxSeq = warehousesMock.reduce((max, item) => Math.max(max, Number(item.code.slice(2))), 0)
  return `WH${String(maxSeq + 1).padStart(3, '0')}`
}
