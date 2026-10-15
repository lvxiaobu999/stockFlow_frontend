import dayjs from 'dayjs'
import { delay, http } from 'msw'
import type { CreateSupplierPayload, SupplierListParams, SupplierRecord } from '@/features/supplier/types'
import type { EnableStatus } from '@/types/common'
import { getMockSession } from '@/mocks/data/auth'
import { appendLog } from '@/mocks/data/operation-logs'
import { buildRecentOrders, nextSupplierCode, suppliersMock } from '@/mocks/data/suppliers'
import { paginate } from '@/mocks/pagination'
import { businessError, httpError, ok } from '@/mocks/utils'

/** 解析查询参数为列表过滤条件。 */
function parseParams(url: URL): SupplierListParams & { pageSize: number } {
  const current = Number(url.searchParams.get('current') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
  const status = url.searchParams.get('status')
  return {
    keyword: url.searchParams.get('keyword') ?? undefined,
    status: status === null || status === '' ? undefined : (Number(status) as EnableStatus),
    inTransit: url.searchParams.get('inTransit') === 'true',
    current,
    pageSize,
  }
}

/** 按列表参数过滤供应商（keyword 模糊匹配名称 / 编码）。 */
function filterSuppliers(params: SupplierListParams): SupplierRecord[] {
  const keyword = params.keyword?.trim()
  return suppliersMock.filter((supplier) => {
    if (keyword && !`${supplier.name}${supplier.code}`.includes(keyword)) return false
    if (params.status !== undefined && supplier.status !== params.status) return false
    if (params.inTransit && supplier.pendingOrderCount === 0) return false
    return true
  })
}

/** 供应商审计日志便捷封装（模块固定为供应商管理）。 */
function logSupplier(operator: string, action: string, targetSummary: string): void {
  appendLog({ operator, module: 'supplier', action, targetSummary })
}

/** 供应商接口：分页、新建、编辑、启停、详情与近 5 笔订单演示数据。 */
export const supplierHandlers = [
  http.get('*/supplier/page', async ({ request }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const params = parseParams(new URL(request.url))
    return ok(paginate(filterSuppliers(params), params.current, params.pageSize))
  }),

  http.post('*/supplier', async ({ request }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const body = (await request.json()) as Partial<CreateSupplierPayload>
    const name = body.name?.trim()
    if (!name) return businessError(4001, '供应商名称不能为空')
    if (suppliersMock.some((item) => item.name === name)) {
      return businessError(4302, '供应商名称已存在')
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const record: SupplierRecord = {
      id: `sup-${dayjs(now).format('MMDDHHmmss')}`,
      code: nextSupplierCode(),
      name,
      contactPerson: body.contactPerson ?? '',
      phone: body.phone ?? '',
      email: body.email,
      address: body.address,
      bankName: body.bankName,
      bankAccount: body.bankAccount,
      taxNo: body.taxNo,
      remark: body.remark,
      status: body.status ?? 1,
      // 在途订单与累计采购额由采购/对账模块上线后实时统计。
      pendingOrderCount: 0,
      totalPurchaseAmount: 0,
      // 门户账号在「用户管理」单独创建，这里不联动开户。
      portalUsername: undefined,
      createdAt: now,
      updatedAt: now,
    }
    suppliersMock.unshift(record)
    logSupplier(session.user.name, '新建供应商', `供应商 ${record.name}（${record.code}）`)
    return ok(record)
  }),

  http.put('*/supplier/:id', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = suppliersMock.find((item) => item.id === params.id)
    if (!record) return businessError(4301, '供应商不存在或已被移除')
    const body = (await request.json()) as Partial<CreateSupplierPayload>

    const name = body.name?.trim()
    if (!name) return businessError(4001, '供应商名称不能为空')
    if (suppliersMock.some((item) => item.name === name && item.id !== record.id)) {
      return businessError(4302, '供应商名称已存在')
    }
    // 编码创建后不可修改，这里刻意不读取 body.code。
    record.name = name
    if (body.contactPerson !== undefined) record.contactPerson = body.contactPerson
    if (body.phone !== undefined) record.phone = body.phone
    if (body.email !== undefined) record.email = body.email
    if (body.address !== undefined) record.address = body.address
    if (body.bankName !== undefined) record.bankName = body.bankName
    if (body.bankAccount !== undefined) record.bankAccount = body.bankAccount
    if (body.taxNo !== undefined) record.taxNo = body.taxNo
    if (body.remark !== undefined) record.remark = body.remark
    if (body.status !== undefined) record.status = body.status
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    logSupplier(session.user.name, '编辑供应商', `供应商 ${record.name}（${record.code}）`)
    return ok(record)
  }),

  http.put('*/supplier/:id/status', async ({ request, params }) => {
    await delay(280)
    const session = getMockSession()
    if (!session) return httpError(401, '登录已过期，请重新登录')
    const record = suppliersMock.find((item) => item.id === params.id)
    if (!record) return businessError(4301, '供应商不存在或已被移除')

    const body = (await request.json()) as { status?: EnableStatus }
    const nextStatus = body.status ?? (record.status === 1 ? 0 : 1)
    // 被采购订单/对账引用时只允许停用（历史不受影响）；物理删除接口不提供，预留 4303。
    record.status = nextStatus
    record.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    logSupplier(
      session.user.name,
      nextStatus === 1 ? '启用供应商' : '停用供应商',
      `供应商 ${record.name}（${record.code}）`,
    )
    return ok(record)
  }),

  http.get('*/supplier/:id/recent-orders', async ({ params }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const record = suppliersMock.find((item) => item.id === params.id)
    if (!record) return businessError(4301, '供应商不存在或已被移除')
    // 采购模块落地前的演示契约：近 5 笔订单。
    return ok(buildRecentOrders(record))
  }),

  http.get('*/supplier/:id', async ({ params }) => {
    await delay(280)
    if (!getMockSession()) return httpError(401, '登录已过期，请重新登录')
    const record = suppliersMock.find((item) => item.id === params.id)
    if (!record) return businessError(4301, '供应商不存在或已被移除')
    return ok(record)
  }),
]
