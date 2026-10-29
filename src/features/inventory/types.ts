/**
 * 库存管理（inventory）领域类型定义。
 *
 * 覆盖仓库档案与「当前库存 / 库存流水 / 安全库存预警」三块库存实体；
 * 字段与后端表结构对齐（详见需求文档《01-库存管理/数据库设计》），
 * 分页复用 httpClient 的 PaginatedData。
 */
import type { ProductUnit } from '@/features/product/types'
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
  /** 库内商品种数（库存数 > 0 的库存行数，由库存模块实时推导回写）。 */
  stockSkuCount: number
  /** 库存总量。 */
  stockQuantity: number
  /** 库存金额（元，口径 = 数量 × 采购参考价）。 */
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

// ── 当前库存 ─────────────────────────────────────────────────────────────

/**
 * 当前库存行（仓库 + 商品唯一维度）。
 *
 * 商品与仓库的展示字段由接口联表回填；quantity 只能由库存流水推导更新，
 * 禁止前端 / 接口直接改数（数据库设计业务约束）。
 */
export interface StockRecord {
  id: string
  warehouseId: string
  warehouseName: string
  productId: string
  productCode: string
  productName: string
  spec: string
  unit: ProductUnit
  /** 所属分类 id（按分类筛选用）。 */
  categoryId: string
  /** 当前库存数量（非负）。 */
  quantity: number
  /** 安全库存（商品级，全仓共用）。 */
  safetyStock: number
  /** 采购参考价（元），库存金额 = 数量 × 参考价。 */
  purchasePrice: number
  /** 最近一次库存变动时间。 */
  updatedAt: string
}

/** 库存列表查询参数。 */
export interface StockListParams {
  warehouseId?: string
  /** 按分类匹配（含子分类，与商品列表口径一致）。 */
  categoryId?: string
  /** 关键字，模糊匹配商品编码 / 名称 / 规格。 */
  keyword?: string
  /** 仅看预警（当前库存 ≤ 安全库存）。 */
  warningOnly?: boolean
  current: number
  pageSize: number
}

/**
 * 库存调整载荷：期初录入与库存纠错同一入口。
 * changeQty 为带符号整数（+ 入 − 出），调整后数量不得为负；
 * 服务端在同一次变更内写调整流水并推导更新库存。
 */
export interface StockAdjustPayload {
  warehouseId: string
  productId: string
  changeQty: number
  remark?: string
}

// ── 库存流水 ─────────────────────────────────────────────────────────────

/** 库存流转类型：入库（验收合格）/ 出库（第二阶段）/ 调整（期初建账与纠错）。 */
export type StockTransactionType = 'inbound' | 'outbound' | 'adjust'

/** 流转类型展示元信息：入库绿 / 出库红 / 调整蓝（需求颜色约定）。 */
export const STOCK_TRANSACTION_TYPE_META: Record<StockTransactionType, { label: string; color: string }> = {
  inbound: { label: '入库', color: 'green' },
  outbound: { label: '出库', color: 'red' },
  adjust: { label: '调整', color: 'blue' },
}

/**
 * 库存流水行（只增不改，审计依据）。
 * quantity 为带符号变动数：入库与正向调整为正，出库与负向调整为负。
 */
export interface StockTransactionRecord {
  id: string
  warehouseId: string
  warehouseName: string
  productId: string
  productCode: string
  productName: string
  spec: string
  unit: ProductUnit
  type: StockTransactionType
  /** 带符号变动数量。 */
  quantity: number
  /** 变动后该仓库该商品的库存快照。 */
  quantityAfter: number
  /** 来源单据类型（如 purchase_order）；调整流水可缺省。 */
  bizType?: string
  /** 来源单据号（冗余，便于展示）。 */
  bizCode?: string
  operatorName?: string
  remark?: string
  createdAt: string
}

/** 库存流水查询参数。 */
export interface StockTransactionListParams {
  warehouseId?: string
  /** 按商品精确定位（库存列表「查看流水」下钻用）。 */
  productId?: string
  type?: StockTransactionType
  /** 关键字，模糊匹配单据号 / 商品编码 / 名称。 */
  keyword?: string
  createdFrom?: string
  createdTo?: string
  current: number
  pageSize: number
}

// ── 安全库存预警 ─────────────────────────────────────────────────────────

/** 安全库存预警行：当前库存 ≤ 安全库存的库存行（缺口 = 安全库存 − 当前库存）。 */
export interface StockAlertRecord {
  warehouseId: string
  warehouseName: string
  productId: string
  productCode: string
  productName: string
  spec: string
  unit: ProductUnit
  quantity: number
  safetyStock: number
  /** 补货缺口 = 安全库存 − 当前库存。 */
  gap: number
  /** 最近一次入库时间（无入库记录时缺省）。 */
  lastInboundAt?: string
  updatedAt: string
}

/** 预警列表查询参数。 */
export interface StockAlertListParams {
  warehouseId?: string
  current: number
  pageSize: number
}
