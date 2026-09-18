/**
 * commitlint 配置：强制 Conventional Commits 提交信息规范。
 * 由 husky 的 commit-msg 钩子调用，格式不合法时阻止提交。
 *
 * 格式：<type>(<scope>): <subject>
 * 示例：feat(inventory): 新增库存预警列表
 *
 * ── type 选择对照表（「改了什么」就选对应类型）──────────────────────────
 *
 * feat     新增功能：新页面、新组件、新接口对接、新业务模块
 *          例：feat(dashboard): 新增库存预警表格
 *
 * fix      修复 bug：修正错误行为，不改设计、不加功能
 *          例：fix(dashboard): 修复库存总值为 0 时页面崩溃
 *
 * docs     只改文档或注释，不动任何运行逻辑
 *          例：docs: 补充 httpClient 响应信封说明
 *
 * style    只改格式，不影响运行结果（空格、缩进、分号、prettier 格式化）
 *          例：style: 统一组件缩进为 2 空格
 *
 * refactor 重构：既不新增功能也不修 bug，只改内部实现（提取、重命名、换目录）
 *          例：refactor(services): 提取请求超时逻辑到独立函数
 *
 * perf     性能优化：减少渲染、懒加载、缓存、减小包体等
 *          例：perf(router): 对重页面启用懒加载
 *
 * test     只增删改测试代码，不碰业务代码
 *          例：test(httpClient): 补充解包响应的单元测试
 *
 * build    影响构建或外部依赖：vite 配置、package.json、依赖版本升级
 *          例：build: 升级 vite 到 6.x
 *
 * ci       影响持续集成配置（.github/workflows 等）
 *          例：ci: 在 workflow 中新增类型检查步骤
 *
 * chore    不涉及 src 和 test 的杂项：.gitignore、lint 规则、工具配置
 *          例：chore: 更新 oxlint 规则
 *
 * revert   回滚之前的某个提交，subject 写被回滚的提交信息
 *          例：revert: 回滚 feat(dashboard) 新增库存预警表格
 *
 * ── 快速判断口诀 ───────────────────────────────────────────────────────
 * 新增功能 feat · 修 bug 用 fix · 只动文档 docs · 只动格式 style ·
 * 内部整理 refactor · 提速 perf · 只动测试 test · 动构建 build ·
 * 动 CI 用 ci · 杂项 chore · 回滚 revert
 *
 * 易混区分：
 * - style vs docs：style 改的是代码格式（不改变运行），docs 改的是说明性文字。
 * - refactor vs perf：refactor 是「整理、不改行为」，perf 是「为了更快而改」。
 * - build vs ci：build 改的是构建产物/依赖，ci 改的是自动化流水线本身。
 */
export default {
  extends: ['@commitlint/config-conventional'],
}
