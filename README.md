# StockFlow Frontend

StockFlow 是一个面向进销存业务的 React 19 + TypeScript + Vite 管理后台前端。仓库只负责前端应用，不包含后端服务和数据库迁移。

## 快速开始

```bash
pnpm install
pnpm dev
```

提交前建议运行：

```bash
pnpm typecheck
pnpm lint
pnpm build
```

常用脚本：

| 命令                | 用途                         |
| ------------------- | ---------------------------- |
| `pnpm dev`          | 启动 Vite 开发服务器         |
| `pnpm typecheck`    | 检查所有 TypeScript 项目     |
| `pnpm lint`         | 运行 Oxlint                  |
| `pnpm build`        | 类型检查并构建生产包         |
| `pnpm format`       | 使用 Prettier 格式化         |
| `pnpm format:check` | 检查格式是否符合规范         |
| `pnpm lint:fix`     | 自动修复可修复的 Oxlint 问题 |

## 目录约定

```text
src/
├─ app/                  # 应用级 Provider、启动配置
├─ components/           # 跨业务复用的展示组件
├─ config/               # 环境变量、导航、应用常量
├─ features/             # 按业务域拆分：页面组件、hooks、services、types
├─ layouts/              # 应用壳层和布局
├─ pages/                # 路由页面入口（保持轻量）
├─ router/               # React Router 路由表
├─ services/             # 全局 typed API client 和基础设施
└─ stores/               # Zustand 全局状态
```

新增业务模块时，在 `src/features/<domain>/` 下维护该领域的类型、服务、hooks 和组件；页面只负责组合模块，不直接调用 `fetch` 或堆积 mock 数据。共享组件放入 `src/components/`，只有确实跨领域复用时才提升到这里。

## 协作约定

- 所有导入优先使用 `@/*` 别名，避免跨目录相对路径。
- UI 文案使用简体中文；领域类型和服务接口先于页面实现。
- API 请求统一经 `src/services/httpClient.ts` 的 Axios 实例，服务端数据统一由 TanStack Query 管理。
- 开发环境默认通过 MSW 接入 mock；设置 `VITE_USE_MOCK_API=false` 后，同一 service 会请求真实后端。
- Zustand 只存放跨页面的 UI/会话状态；表单临时状态和服务端数据放在 feature hook/service 中。
- 页面较重时使用 `lazy` + `Suspense`，并提供加载、空数据和错误状态。
- commit 遵循 Conventional Commits，例如 `feat(inventory): add stock list`。
- Husky 的 `commit-msg` 校验 commitlint，`pre-commit` 运行 lint-staged（格式化和 Oxlint）。

更完整的说明见 [docs/前端架构说明.md](./docs/前端架构说明.md)、[docs/接口与 Mock 说明.md](<./docs/接口与 Mock 说明.md>) 和 [docs/配置文件说明.md](./docs/配置文件说明.md)。
