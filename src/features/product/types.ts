/**
 * 商品管理（product）领域类型定义。
 *
 * 覆盖商品分类与商品档案两块实体；字段与后端表结构对齐（详见需求文档
 * 《02-商品管理/数据库设计》），分页复用 httpClient 的 PaginatedData。
 */
import type { EnableStatus } from '@/types/common'

/** 商品分类。接口返回扁平列表（镜像数据库表），树结构由前端工具函数构建。 */
export interface CategoryRecord {
  id: string
  /** 上级分类 id；null 表示顶级分类。层级最多 3 级。 */
  parentId: string | null
  /** 分类名称。 */
  name: string
  /** 层级段式编码（如 010102），服务端生成、创建后不可修改。 */
  code: string
  /** 排序号，越小越靠前。 */
  sort: number
  status: EnableStatus
  remark?: string
  /** 子树商品计数（后端按全部子孙实时汇总，对应原型的「办公用品 86 个商品」口径）。 */
  productCount: number
  createdAt: string
  updatedAt: string
}

/** 分类树节点：组树后在记录上挂子级数组。 */
export interface CategoryTreeNode extends CategoryRecord {
  children?: CategoryTreeNode[]
}

/** 新建分类载荷：编码由服务端生成，不开放给表单。 */
export interface CreateCategoryPayload {
  parentId: string | null
  name: string
  sort: number
  status: EnableStatus
  remark?: string
}

/** 编辑分类载荷：编码不可修改；上级分类允许调整，但不可落在自身/子孙。 */
export type UpdateCategoryPayload = CreateCategoryPayload

/** 商品计量单位（需求枚举，无独立单位档案）。 */
export const PRODUCT_UNITS = ['个', '箱', '盒', '提', '套'] as const
export type ProductUnit = (typeof PRODUCT_UNITS)[number]

/** 商品档案。停用后不可被新采购单据引用，历史单据不受影响。 */
export interface ProductRecord {
  id: string
  /** 商品编码（SP-YYYYMMDD-NNNN），服务端生成、创建后不可修改。 */
  code: string
  name: string
  /** 规格型号。 */
  spec: string
  unit: ProductUnit
  /** 所属分类 id。 */
  categoryId: string
  /** 采购参考价（元）。 */
  purchasePrice: number
  /** 销售参考价（元）。预留字段，本期仅存展示。 */
  salePrice?: number
  /** 安全库存：当前总库存低于该值时触发预警。 */
  safetyStock: number
  /** 当前总库存（跨仓合计；库存模块落地前的投影字段）。 */
  totalStock: number
  /** 主图（URL 或 dataURL；mock 阶段为内存 dataURL，刷新丢失）。 */
  imageUrl?: string
  description?: string
  status: EnableStatus
  createdAt: string
  updatedAt: string
}

/** 商品列表查询参数。 */
export interface ProductListParams {
  /** 关键字，模糊匹配编码 / 名称 / 规格。 */
  keyword?: string
  /** 按分类精确匹配。 */
  categoryId?: string
  status?: EnableStatus
  /** 仅看低于安全库存的商品。 */
  stockBelowSafety?: boolean
  current: number
  pageSize: number
}

/** 新建/编辑商品载荷：编码由服务端生成，编辑时服务端忽略 code。 */
export interface ProductPayload {
  categoryId: string
  name: string
  spec: string
  unit: ProductUnit
  purchasePrice: number
  salePrice?: number
  safetyStock: number
  imageUrl?: string
  description?: string
  status: EnableStatus
}

/** 库存汇总行：商品在单个仓库的库存状态（库存模块投影字段）。 */
export interface ProductStockSummaryRow {
  warehouseId: string
  warehouseName: string
  stock: number
  /** true=低于安全库存（预警）。安全库存为商品级，全仓共用（需求 P1-6 口径）。 */
  warning: boolean
  /** 最近一次库存变动时间（ISO 字符串）。 */
  lastChangeAt?: string
}

/** 商品库存汇总（详情页「库存汇总（按仓库）」数据块）。 */
export interface ProductStockSummary {
  totalStock: number
  safetyStock: number
  rows: ProductStockSummaryRow[]
}

/** 库存流水行（详情页「最近库存流水」，库存模块演示契约）。 */
export interface ProductStockTransaction {
  id: string
  /** 发生时间（ISO 字符串）。 */
  occurredAt: string
  /** in=入库（绿） out=出库（红）。 */
  type: 'in' | 'out'
  /** 变动数量（正数，方向看 type）。 */
  quantity: number
  /** 变动后的库存数量。 */
  afterStock: number
  /** 关联单据号（如采购订单号）。 */
  relatedOrderNo?: string
  operator: string
}
