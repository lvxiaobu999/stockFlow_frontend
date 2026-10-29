import dayjs from 'dayjs'
import type { ShipmentItem, ShipmentRecord } from '@/features/supplier-portal/types'
import { purchaseOrdersMock } from './purchaseOrders'

/**
 * 发货单 Mock 数据：由采购订单数据集**派生**——订单写入 shippedAt 即必然
 * 产生一张发货单（MVP 一次发清，一单至多一单发货），保证订单状态与发货单
 * 一一对应；门户「填写发货」动作由 portalHandlers 在此追加新单。
 *
 * - 编号 SH + 发货日期 + 4 位流水，全局流水随发货日期递增；
 * - 明细数量快照 = 订单明细（shippedQty = orderedQty），含订单数量投影供对照；
 * - 物流渠道按订单固定（见 SEED_LOGISTICS），不引入随机值。
 */

/** 种子订单的物流信息：已发货订单必然在此有对应条目（数据集不变量）。 */
const SEED_LOGISTICS: Record<string, { logisticsCompany: string; trackingNo: string; remark?: string }> = {
  'po-001': { logisticsCompany: '顺丰速运', trackingNo: 'SF3160882206601' },
  'po-003': { logisticsCompany: '德邦物流', trackingNo: 'DB952771088336', remark: '两托复印纸，需送货入仓' },
  'po-006': { logisticsCompany: '京东物流', trackingNo: 'JD0041228890517' },
  'po-007': { logisticsCompany: '德邦物流', trackingNo: 'DB77120945512', remark: '文件柜包装易损，收货时请当面验货' },
  'po-009': { logisticsCompany: '顺丰速运', trackingNo: 'SF3172201190884', remark: '月度补货一次性发出' },
  // 对账管理模块铺垫订单（po-014 ~ po-018）的物流种子。
  'po-014': { logisticsCompany: '顺丰速运', trackingNo: 'SF3180331077211', remark: '打印耗材月度补货' },
  'po-015': { logisticsCompany: '京东物流', trackingNo: 'JD0055780112934' },
  'po-016': { logisticsCompany: '德邦物流', trackingNo: 'DB882310477653', remark: '文具整箱发货，注意防潮' },
  'po-017': { logisticsCompany: '中通快递', trackingNo: 'ZT3390215588607' },
  'po-018': { logisticsCompany: '韵达快递', trackingNo: 'YD4460219012285' },
}

/** 由订单明细构建发货明细快照（MVP 一次发清：实发 = 订购）。 */
function itemsFromOrder(shipmentId: string, order: (typeof purchaseOrdersMock)[number]): ShipmentItem[] {
  return order.items.map((item, index) => ({
    id: `${shipmentId}-item-${index + 1}`,
    productId: item.productId,
    productCode: item.productCode,
    productName: item.productName,
    spec: item.spec,
    unit: item.unit,
    orderedQty: item.quantity,
    shippedQty: item.quantity,
    remark: item.remark,
  }))
}

/** 已发货订单 → 发货单（按发货时间升序分配流水，最新在前便于列表展示）。 */
export const shipmentsMock: ShipmentRecord[] = (() => {
  const shippedOrders = purchaseOrdersMock
    .filter((order) => order.shippedAt !== undefined)
    .sort((a, b) => a.shippedAt!.localeCompare(b.shippedAt!))

  const records = shippedOrders.map((order, index) => {
    const logistics = SEED_LOGISTICS[order.id]
    // 数据集不变量：每张已发货订单都必须配置物流种子，缺漏直接暴露。
    if (!logistics) throw new Error(`已发货订单缺少物流种子：${order.id}`)
    const id = `sh-${String(index + 1).padStart(3, '0')}`
    return {
      id,
      code: `SH${dayjs(order.shippedAt).format('YYYYMMDD')}${String(index + 1).padStart(4, '0')}`,
      orderId: order.id,
      orderCode: order.code,
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      logisticsCompany: logistics.logisticsCompany,
      trackingNo: logistics.trackingNo,
      shippedAt: order.shippedAt!,
      remark: logistics.remark,
      items: itemsFromOrder(id, order),
      // 门户操作人展示名 = 供应商账号名（即公司名）。
      createdByName: order.supplierName,
      createdAt: order.shippedAt!,
    } satisfies ShipmentRecord
  })

  return records.sort((a, b) => b.shippedAt.localeCompare(a.shippedAt))
})()

/**
 * 生成下一个发货单号：全局最大流水 + 1，日期段为当天（发货动作发生的日期）。
 * 与采购订单编号同口径：预取仅作展示，保存以服务端生成为准。
 */
export function nextShipmentCode(): string {
  const maxSeq = shipmentsMock.reduce((max, item) => Math.max(max, Number(item.code.slice(-4))), 0)
  return `SH${dayjs().format('YYYYMMDD')}${String(maxSeq + 1).padStart(4, '0')}`
}
