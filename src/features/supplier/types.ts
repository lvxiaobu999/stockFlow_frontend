/**
 * 供应商管理（supplier）领域类型定义。
 *
 * 字段与后端表结构对齐（详见需求文档《07-供应商管理/数据库设计》）；
 * 银行/开票信息在付款与对账环节引用，本期一并维护。
 */
import type { EnableStatus } from '@/types/common'

/** 供应商档案。停用后不可被新采购订单引用，历史订单/对账/付款不受影响。 */
export interface SupplierRecord {
  id: string
  /** 供应商编码（SUP + 4 位流水），服务端生成、创建后不可修改。 */
  code: string
  /** 供应商名称（公司全称）。 */
  name: string
  /** 联系人。 */
  contactPerson: string
  /** 联系电话：11 位手机号或区号-座机号。 */
  phone: string
  email?: string
  address?: string
  /** 开户银行（付款与对账环节引用）。 */
  bankName?: string
  /** 银行账号。 */
  bankAccount?: string
  /** 纳税人识别号（统一社会信用代码，18 位）。 */
  taxNo?: string
  remark?: string
  status: EnableStatus
  /** 在途订单数（采购订单模块起由订单数据集回写：待供应商确认 + 已确认 + 已发货）。 */
  pendingOrderCount: number
  /** 累计采购额（元，对账 / 付款模块落地前的投影字段）。 */
  totalPurchaseAmount: number
  /** 门户账号：user 表中该供应商的登录账号；未开通门户账号时缺省。 */
  portalUsername?: string
  createdAt: string
  updatedAt: string
}

/** 供应商列表查询参数。 */
export interface SupplierListParams {
  /** 关键字，模糊匹配名称 / 编码。 */
  keyword?: string
  status?: EnableStatus
  /** true=仅看有在途订单的供应商。 */
  inTransit?: boolean
  current: number
  pageSize: number
}

/** 新建供应商载荷：编码由服务端生成，不开放给表单。 */
export interface CreateSupplierPayload {
  name: string
  contactPerson: string
  phone: string
  email?: string
  address?: string
  bankName?: string
  bankAccount?: string
  taxNo?: string
  remark?: string
  status: EnableStatus
}

/** 编辑供应商载荷：编码不可修改。 */
export type UpdateSupplierPayload = CreateSupplierPayload

/** 供应商近 5 笔采购订单（详情页演示契约；真实接口需按供应商过滤采购订单）。 */
export interface SupplierRecentOrder {
  id: string
  orderNo: string
  /** 下单时间（ISO 字符串）。 */
  placedAt: string
  /** 订单金额（元）。 */
  totalAmount: number
  /** 订单状态编码与展示名（与采购订单状态字典同口径，见 purchase/types）。 */
  statusCode: string
  statusName: string
}

/**
 * 启用供应商下拉选项（采购订单的供应商选择与筛选栏共用）。
 * 仅返回启用供应商：停用供应商不可被新订单引用，历史单据用名称快照展示。
 */
export interface SupplierOption {
  id: string
  code: string
  name: string
  contactPerson: string
}
