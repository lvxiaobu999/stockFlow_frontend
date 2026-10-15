import { authHandlers } from './handlers/authHandlers'
import { operationLogHandlers } from './handlers/operationLogHandlers'
import { roleHandlers } from './handlers/roleHandlers'
import { userHandlers } from './handlers/userHandlers'

/** 所有 Mock 接口处理器；响应必须严格匹配 ApiResponse<T> 信封结构。 */
export const handlers = [...authHandlers, ...userHandlers, ...roleHandlers, ...operationLogHandlers]
