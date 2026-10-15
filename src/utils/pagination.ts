/**
 * 把后端返回的总页数换算成 antd Pagination 需要的 total。
 *
 * 项目接口约定 PaginatedData.total 表示总页数，而 antd 分页组件的 total
 * 期望「总条数」口径；这里用 总页数 × 每页条数 兜底换算（末页不足一页时
 * 多出的空余不影响使用，点进末页会返回较少的行）。
 */
export function toPaginationTotal(totalPages: number, pageSize: number): number {
  if (totalPages <= 0) return 0
  return totalPages * pageSize
}
