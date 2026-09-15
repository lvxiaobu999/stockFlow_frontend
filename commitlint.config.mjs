/**
 * commitlint 配置：强制 Conventional Commits 提交信息规范。
 * 由 husky 的 commit-msg 钩子调用，格式不合法时阻止提交。
 *
 * 允许的类型：feat / fix / docs / style / refactor / perf / test / build / ci / chore / revert
 * 格式示例：feat(inventory): 新增库存预警列表
 */
export default {
  extends: ['@commitlint/config-conventional'],
}
