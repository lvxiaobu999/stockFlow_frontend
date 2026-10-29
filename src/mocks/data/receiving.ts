import dayjs from 'dayjs'
import type {
  InspectionItem,
  InspectionRecord,
  InspectionResult,
  ReceiptItem,
  ReceiptRecord,
} from '@/features/receiving/types'
import { findUserByUsername } from './users'
import { purchaseOrdersMock } from './purchaseOrders'
import type { ShipmentRecord } from '@/features/supplier-portal/types'
import { shipmentsMock } from './shipments'

/**
 * 收货与验收 Mock 数据：收货单由发货单**派生预建**（供应商发货即产生待收货单，
 * 与数据库设计 receipt.status 默认 pending 一致），验收单由已收货单派生预建
 * （确认收货即产生待验收单，inspection.result 默认 pending）。
 *
 * - 种子范围：全部已发货订单（发货单 1:1 收货单）；其中已有 receivedAt 的订单
 *   收货单落「已收货」，已有 inspectedAt 的订单验收单落结论（po-003 全部合格、
 *   po-006 部分合格含破损演示）；po-001 已收货未验收，保留待验收演示单；
 * - 编号 RC / IS + 单据日期 + 4 位流水，全局流水随单据创建时间递增；
 * - MVP 一次收清：实收数量 = 应发数量（少收待确认收货动作演示）；
 * - 仓库操作人按 吴军 / 冯逸 / 高帆 轮换（仓储部员工）；
 * - 「门户发货 → 预建收货单」由 receiving.ts 暴露的 createPendingReceiptForShipment
 *   在 portalHandlers 发货动作中调用，保证「发货单 : 收货单 = 1:1」在运行期成立。
 */

/** 仓储部演示员工（收货人 / 验收人轮换池），必须为真实内部员工账号。 */
const WAREHOUSE_OPERATORS = ['wujun', 'fengyi', 'gaofan']

/** 部分合格演示配置：按明细下标声明合格 / 不合格拆分（未声明的行全部合格）。 */
const PARTIAL_INSPECTION_SEEDS: Record<
  string,
  Array<{ qualifiedQty: number; unqualifiedQty: number; remark?: string }>
> = {
  // po-006（维达商用擦手纸等）：第 1 行 2 件外包装破损 → 部分合格演示。
  'po-006': [
    { qualifiedQty: 38, unqualifiedQty: 2, remark: '其中 2 件外包装破损，仅记录不入库' },
    { qualifiedQty: 20, unqualifiedQty: 0 },
  ],
}

/** 由发货单明细构建收货明细快照（应发 = 实发；已收货单实收 = 应发，待收货为 0）。 */
function itemsFromShipment(receiptId: string, shipment: ShipmentRecord, received: boolean): ReceiptItem[] {
  return shipment.items.map((item, index) => ({
    id: `${receiptId}-item-${index + 1}`,
    productId: item.productId,
    productCode: item.productCode,
    productName: item.productName,
    spec: item.spec,
    unit: item.unit,
    expectedQty: item.shippedQty,
    receivedQty: received ? item.shippedQty : 0,
    remark: item.remark,
  }))
}

/** 由验收结论汇总判定结果：全合格 / 全不合格 / 部分合格（服务端口径，前端不传）。 */
function resolveInspectionResult(items: InspectionItem[]): InspectionResult {
  const qualifiedTotal = items.reduce((sum, item) => sum + item.qualifiedQty, 0)
  const receivedTotal = items.reduce((sum, item) => sum + item.receivedQty, 0)
  if (qualifiedTotal === 0) return 'unqualified'
  return qualifiedTotal === receivedTotal ? 'qualified' : 'partial'
}

/** 轮换取仓储操作人展示名（下标越界时取模，保持确定性）。 */
function operatorName(index: number): string {
  const username = WAREHOUSE_OPERATORS[index % WAREHOUSE_OPERATORS.length]
  const user = findUserByUsername(username)
  if (!user) throw new Error(`仓储操作人账号不存在：${username}`)
  return user.name
}

/** 收货单 / 验收单构建（一次成型，receipt ↔ inspection 投影双向回写）。 */
export const receiptsMock: ReceiptRecord[] = []
export const inspectionsMock: InspectionRecord[] = []

;(() => {
  // 发货时间升序分配流水（与发货单派生口径一致），展示时再倒序。
  const shipmentsAsc = [...shipmentsMock].sort((a, b) => a.shippedAt.localeCompare(b.shippedAt))
  const orderById = new Map(purchaseOrdersMock.map((order) => [order.id, order]))

  let receiptSeq = 0
  let receivedSeq = 0
  for (const shipment of shipmentsAsc) {
    const order = orderById.get(shipment.orderId)
    if (!order) throw new Error(`收货单派生引用了不存在的订单：${shipment.orderId}`)
    const received = order.receivedAt !== undefined

    receiptSeq += 1
    const receiptId = `rc-${String(receiptSeq).padStart(3, '0')}`
    const receipt: ReceiptRecord = {
      id: receiptId,
      code: `RC${dayjs(shipment.shippedAt).format('YYYYMMDD')}${String(receiptSeq).padStart(4, '0')}`,
      orderId: order.id,
      orderCode: order.code,
      shipmentId: shipment.id,
      shipmentCode: shipment.code,
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      status: received ? 'received' : 'pending',
      items: itemsFromShipment(receiptId, shipment, received),
      remark: received ? shipment.remark : undefined,
      receivedByName: received ? operatorName(receivedSeq) : undefined,
      receivedAt: order.receivedAt,
      createdAt: shipment.shippedAt,
      updatedAt: order.receivedAt ?? shipment.shippedAt,
    }

    // 已收货单预建待验收单；已有 inspectedAt 的订单直接落结论。
    if (received) {
      const settled = order.inspectedAt !== undefined
      const partialSeed = PARTIAL_INSPECTION_SEEDS[order.id]
      const inspectionId = `is-${String(inspectionsMock.length + 1).padStart(3, '0')}`
      const inspectionItems: InspectionItem[] = receipt.items.map((item, index) => {
        const seed = partialSeed?.[index]
        const qualifiedQty = seed ? seed.qualifiedQty : settled ? item.receivedQty : 0
        const unqualifiedQty = seed?.unqualifiedQty ?? 0
        return {
          id: `${inspectionId}-item-${index + 1}`,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          spec: item.spec,
          unit: item.unit,
          orderedQty:
            order.items.find((orderItem) => orderItem.productId === item.productId)?.quantity ?? item.expectedQty,
          receivedQty: item.receivedQty,
          qualifiedQty,
          unqualifiedQty,
          remark: seed?.remark,
        }
      })
      const inspection: InspectionRecord = {
        id: inspectionId,
        code: `IS${dayjs(receipt.receivedAt!).format('YYYYMMDD')}${String(inspectionsMock.length + 1).padStart(4, '0')}`,
        orderId: order.id,
        orderCode: order.code,
        receiptId: receipt.id,
        receiptCode: receipt.code,
        supplierId: order.supplierId,
        supplierName: order.supplierName,
        result: settled ? resolveInspectionResult(inspectionItems) : 'pending',
        items: inspectionItems,
        remark: settled ? (partialSeed ? '破损件已登记，待第二阶段退货处理' : undefined) : undefined,
        inspectedByName: settled ? operatorName(receivedSeq) : undefined,
        inspectedAt: order.inspectedAt,
        createdAt: order.receivedAt!,
        updatedAt: order.inspectedAt ?? order.receivedAt!,
      }
      receipt.inspectionId = inspection.id
      receipt.inspectionCode = inspection.code
      receipt.inspectionResult = inspection.result
      inspectionsMock.push(inspection)
      receivedSeq += 1
    }

    receiptsMock.push(receipt)
  }
})()

/** 新收货单 / 验收单插入后保持「最新在前」的展示口径。 */
receiptsMock.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
inspectionsMock.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

/** 生成下一个收货单号：全局最大流水 + 1，日期段为当天（单据生成口径同发货单）。 */
export function nextReceiptCode(): string {
  const maxSeq = receiptsMock.reduce((max, item) => Math.max(max, Number(item.code.slice(-4))), 0)
  return `RC${dayjs().format('YYYYMMDD')}${String(maxSeq + 1).padStart(4, '0')}`
}

/** 生成下一个验收单号：全局最大流水 + 1，日期段为当天。 */
export function nextInspectionCode(): string {
  const maxSeq = inspectionsMock.reduce((max, item) => Math.max(max, Number(item.code.slice(-4))), 0)
  return `IS${dayjs().format('YYYYMMDD')}${String(maxSeq + 1).padStart(4, '0')}`
}

/**
 * 供应商发货后预建「待收货」收货单（portalHandlers 发货动作调用）。
 * 保证「发货单 : 收货单 = 1:1」在运行期与种子期同样成立。
 */
export function createPendingReceiptForShipment(shipment: ShipmentRecord): ReceiptRecord {
  const receipt: ReceiptRecord = {
    id: `rc-${dayjs(shipment.shippedAt).format('MMDDHHmmss')}`,
    code: nextReceiptCode(),
    orderId: shipment.orderId,
    orderCode: shipment.orderCode,
    shipmentId: shipment.id,
    shipmentCode: shipment.code,
    supplierId: shipment.supplierId,
    supplierName: shipment.supplierName,
    status: 'pending',
    items: shipment.items.map((item, index) => ({
      id: `${shipment.id}-receipt-item-${index + 1}`,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      spec: item.spec,
      unit: item.unit,
      expectedQty: item.shippedQty,
      receivedQty: 0,
      remark: item.remark,
    })),
    createdAt: shipment.shippedAt,
    updatedAt: shipment.shippedAt,
  }
  receiptsMock.unshift(receipt)
  return receipt
}
