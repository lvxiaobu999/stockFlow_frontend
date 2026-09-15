import { QueryClient } from '@tanstack/react-query'

/** 全局服务端状态缓存。接口数据放在 Query 中，不要复制到全局 UI store。 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
