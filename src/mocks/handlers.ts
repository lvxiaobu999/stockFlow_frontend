import { approvalHandlers } from './handlers/approvalHandlers'
import { authHandlers } from './handlers/authHandlers'
import { categoryHandlers } from './handlers/categoryHandlers'
import { operationLogHandlers } from './handlers/operationLogHandlers'
import { portalHandlers } from './handlers/portalHandlers'
import { productHandlers } from './handlers/productHandlers'
import { purchaseOrderHandlers } from './handlers/purchaseOrderHandlers'
import { purchaseRequestHandlers } from './handlers/purchaseHandlers'
import { roleHandlers } from './handlers/roleHandlers'
import { supplierHandlers } from './handlers/supplierHandlers'
import { userHandlers } from './handlers/userHandlers'
import { warehouseHandlers } from './handlers/warehouseHandlers'

/** 所有 Mock 接口处理器；响应必须严格匹配 ApiResponse<T> 信封结构。 */
export const handlers = [
  ...authHandlers,
  ...userHandlers,
  ...roleHandlers,
  ...operationLogHandlers,
  ...categoryHandlers,
  ...productHandlers,
  ...purchaseRequestHandlers,
  ...purchaseOrderHandlers,
  ...approvalHandlers,
  ...supplierHandlers,
  ...portalHandlers,
  ...warehouseHandlers,
]
