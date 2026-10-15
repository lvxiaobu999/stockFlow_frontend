import dayjs from 'dayjs'
import { delay, http } from 'msw'
import type { CreateWarehousePayload, WarehouseListParams, WarehouseRecord } from '@/features/inventory/types'
import type { EnableStatus } from '@/types/common'
import { getMockSession } from '@/mocks/data/auth'
import { appendLog } from '@/mocks/data/operation-logs'
import { nextWarehouseCode, warehousesMock } from '@/mocks/data/warehouses'
import { usersMock } from '@/mocks/data/users'
import { paginate } from '@/mocks/pagination'
import { businessError, httpError, ok } from '@/mocks/utils'

/** 解析查询参数为列表过滤条件。 */
function parseParams(url: URL): WarehouseListParams & { pageSize: number } {
  const current = Number(url.searchParams.get('current') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
  const status = url.searchParams.get('status')
  return {
    keyword: url.searchParams.get('keyword') ?? undefined,
    status: status === null || status === '' ? undefined : (Number(status) as EnableStatus),
    current,
    pageSize,
  }
}

/** 按列表参数过滤仓库（keyword 模糊匹配名称 / 编码）。 */
function filterWarehouses(params: WarehouseListParams): WarehouseRecord[] {
  const keyword = params.keyword?.trim()
  return warehousesMock.filter((warehouse) => {
    if (keyword && !`${warehouse.name}${warehouse.code}`.includes(keyword)) return false
    if (params.status !== undefined && warehouse.status !== params.status) return false
    return true
  })
}

/** 记录 → API 记录：按 ownerUserId 实时回填负责人姓名。 */
function toRecord(warehouse: WarehouseRecord): WarehouseRecord {
  const owner = warehouse.ownerUserId ? usersMock.find((user) => user.id === warehouse.ownerUserId) : undefined
  return { ...warehouse, ownerName: owner?.name }
}

/** 仓库审计日志便捷封装（模块固定为仓库管理）。 */
function logWarehouse(operator: string, action: string, targetSummary: string): void {
  appendLog({ operator, module: 'inventory', action, targetSummary })
}

/** 仓库接口：分页、新建、编辑与启停。 */
export const warehouseHandlers = [
  http.get('*/inventory/warehouse/page', async ({ request }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const params = parseParams(new URL(request.url))
    return ok(paginate(filterWarehouses(params).map(toRecord), params.current, params.pageSize))
  }),

  http.post('*/inventory/warehouse', async ({ request }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const body = (await request.json()) as Partial<CreateWarehousePayload>
    const name = body.name?.trim()
    if (!name) return businessError(4001, '仓库名称不能为空')
    if (warehousesMock.some((item) => item.name === name)) {
      return businessError(4402, '仓库名称已存在')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const record: WarehouseRecord = {
      id: `wh-${dayjs(now).format('MMDDHHmmss')}`,
      code: nextWarehouseCode(),
      name,
      ownerUserId: body.ownerUserId,
      phone: body.phone,
      address: body.address,
      remark: body.remark,
      status: body.status ?? 1,
      // 新建仓库暂无库存；统计三列由库存模块上线后实时计算。
      stockSkuCount: 0,
      stockQuantity: 0,
      stockAmount: 0,
      updatedAt: now,
    }
    warehousesMock.push(record)
    logWarehouse(session.user.name, '新建仓库', `仓库 ${record.name}（${record.code}）`)
    return ok(toRecord(record))
  }),

  http.put('*/inventory/warehouse/:id', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = warehousesMock.find((item) => item.id === params.id)
    if (!record) return businessError(4401, '仓库不存在或已被移除')
    const body = (await request.json()) as Partial<CreateWarehousePayload>

    const name = body.name?.trim()
    if (!name) return businessError(4001, '仓库名称不能为空')
    if (warehousesMock.some((item) => item.name === name && item.id !== record.id)) {
      return businessError(4402, '仓库名称已存在')
    }
    // 编码创建后不可修改，这里刻意不读取 body.code。
    record.name = name
    if (body.ownerUserId !== undefined) record.ownerUserId = body.ownerUserId
    if (body.phone !== undefined) record.phone = body.phone
    if (body.address !== undefined) record.address = body.address
    if (body.remark !== undefined) record.remark = body.remark
    if (body.status !== undefined) record.status = body.status
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    logWarehouse(session.user.name, '编辑仓库', `仓库 ${record.name}（${record.code}）`)
    return ok(toRecord(record))
  }),

  http.put('*/inventory/warehouse/:id/status', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = warehousesMock.find((item) => item.id === params.id)
    if (!record) return businessError(4401, '仓库不存在或已被移除')

    const body = (await request.json()) as { status?: EnableStatus }
    const nextStatus = body.status ?? (record.status === 1 ? 0 : 1)
    // 订单发送供应商前必须选择启用的仓库，总仓为默认仓库不允许停用。
    if (record.isHeadquarters && nextStatus === 0) {
      return businessError(4403, '总仓为默认仓库，不允许停用')
    }
    record.status = nextStatus
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    logWarehouse(session.user.name, nextStatus === 1 ? '启用仓库' : '停用仓库', `仓库 ${record.name}（${record.code}）`)
    return ok(toRecord(record))
  }),
]
