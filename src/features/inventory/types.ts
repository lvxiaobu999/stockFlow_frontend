/**
 * 库存管理（inventory）领域类型定义。
 *
 * 本期随「基础资料」仅落「仓库」实体；当前库存、库存流水、安全库存预警等
 * 在库存模块开发时补充，分页复用 httpClient 的 PaginatedData。
 */
import type { EnableStatus } from '@/types/common'

/**
 * 仓库档案。
 *
 * 说明：需求《01-库存管理/数据库设计》仅定义 code/name/status/remark 四字段，
 * 原型增加了负责人/联系电话/地址与库存统计列，本契约按原型实现（扩表偏差
 * 已在 docs/接口与 Mock 说明.md 记录）。
 */
export interface WarehouseRecord {
  id: string
  /** 仓库编码（WH + 3 位流水），服务端生成、创建后不可修改。 */
  code: string
  /** 仓库名称。 */
  name: string
  /** 负责人用户 id（内部员工）；缺省表示待分配。 */
  ownerUserId?: string
  /** 负责人姓名（接口按 ownerUserId 实时回填）。 */
  ownerName?: string
  phone?: string
  /** 仓库地址。 */
  address?: string
  remark?: string
  status: EnableStatus
  /** 内置总仓标记：总仓不允许停用（前端约定，待后端确认）。 */
  isHeadquarters?: boolean
  /** 库内商品种数（库存模块落地前的投影字段）。 */
  stockSkuCount: number
  /** 库存总量。 */
  stockQuantity: number
  /** 库存金额（元）。 */
  stockAmount: number
  updatedAt: string
}

/** 仓库列表查询参数。 */
export interface WarehouseListParams {
  /** 关键字，模糊匹配名称 / 编码。 */
  keyword?: string
  status?: EnableStatus
  current: number
  pageSize: number
}

/** 新建仓库载荷：编码由服务端生成，不开放给表单。 */
export interface CreateWarehousePayload {
  name: string
  ownerUserId?: string
  phone?: string
  address?: string
  remark?: string
  status: EnableStatus
}

/** 编辑仓库载荷：编码不可修改。 */
export type UpdateWarehousePayload = CreateWarehousePayload
