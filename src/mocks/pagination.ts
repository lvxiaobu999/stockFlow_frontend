import type { PaginatedData } from '@/services/httpClient'

/**
 * 在内存列表上模拟后端分页，返回与真实接口一致的 PaginatedData 结构。
 * total 遵循项目约定表示总页数；页码越界时返回空列表而不是抛错，与后端行为一致。
 */
export function paginate<T>(list: T[], current: number, pageSize: number): PaginatedData<T> {
  const total = Math.ceil(list.length / pageSize)
  const start = (current - 1) * pageSize
  return {
    current,
    pageSize,
    total,
    lists: list.slice(start, start + pageSize),
  }
}
