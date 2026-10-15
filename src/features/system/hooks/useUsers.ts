import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { userService } from '@/features/system/services/userService'
import type { PaginatedData } from '@/services/httpClient'
import type { UserListParams, UserRecord } from '@/features/system/types'

export const userQueryKeys = {
  /** 用户查询共用的根 key，增删改后整体失效。 */
  all: ['system', 'users'] as const,
  /** 分页查询 key：筛选与分页参数全部进入 key，保证不同查询互不串缓存。 */
  page: (params: UserListParams) => [...userQueryKeys.all, 'page', params] as const,
}

export interface UsersQuery {
  data: PaginatedData<UserRecord> | null
  isLoading: boolean
  /** 翻页或失效后的重新请求中，用于表格的轻量 loading。 */
  isFetching: boolean
  error: Error | null
  refetch: () => Promise<unknown>
}

/** 用户分页查询：翻页时保留上一页数据（placeholderData），避免整表闪烁。 */
export function useUsers(params: UserListParams): UsersQuery {
  const query = useQuery({
    queryKey: userQueryKeys.page(params),
    queryFn: ({ signal }) => userService.getPage(params, signal),
    placeholderData: keepPreviousData,
  })

  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

/** 启用内部员工下拉（仓库负责人等引用场景）；静态数据，长时间缓存。 */
export function useStaffOptions() {
  const query = useQuery({
    queryKey: [...userQueryKeys.all, 'staff-options'] as const,
    queryFn: ({ signal }) => userService.getStaffOptions(signal),
    staleTime: 5 * 60 * 1000,
  })
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  }
}
