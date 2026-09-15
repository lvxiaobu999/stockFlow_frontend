# Feature 业务模块模板

每个业务域使用一个垂直切片目录，例如：

```text
src/features/inventory/
├─ components/       # 只服务当前业务域的 UI
├─ hooks/            # 页面数据编排、筛选和刷新行为
├─ services/         # 使用 src/services/httpClient 的类型化 API
├─ types.ts          # 请求、响应和领域模型
└─ index.ts          # 对外公开的最小 API
```

页面只从 feature 的入口组合能力，不直接访问 `fetch`、mock 常量或 feature 内部实现文件。跨业务复用的展示组件才放到 `src/components/`。

当一个业务域出现多个子模块时可以自然形成树形结构，例如库存域：

```text
features/inventory/
├─ overview/
├─ records/
└─ index.ts
```

对应的 `pages/inventory/` 只放 `InventoryOverviewPage.tsx`、`InventoryRecordsPage.tsx` 等路由入口。模块简单时不必提前拆深，按复杂度渐进拆分。
