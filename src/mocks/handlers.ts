import { delay, http, HttpResponse } from 'msw'
import { dashboardMock } from '@/mocks/data/dashboard'

/** 所有 Mock 接口处理器；响应必须严格匹配 ApiResponse<T> 信封结构。 */
export const handlers = [
  http.get('*/dashboard/summary', async () => {
    // 模拟网络延迟，让加载态和进度条在开发环境可见。
    await delay(280)
    return HttpResponse.json({
      code: 1,
      message: 'success',
      data: dashboardMock,
    })
  }),
]
