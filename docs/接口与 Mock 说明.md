# 接口与 Mock 说明

## Axios 调用约定

不要在页面或展示组件中直接导入 Axios。统一通过 `src/services/httpClient.ts` 导出的 `request`（底层实例为 `apiClient`）：

```ts
import { request } from '@/services/httpClient'
import type { Product } from '@/features/products/types'

export async function getProducts(signal?: AbortSignal) {
  return request<Product[]>('/products', { signal })
}
```

实例已统一配置 `baseURL`、`withCredentials`、JSON 请求头、15 秒超时和错误归一化。后端响应统一为 `{ code, message, data }`，其中 `code === 1` 表示成功，`request` 会自动校验并解包 `data`；其它 code 会抛出 `ApiError`。需要取消请求时，将 TanStack Query 提供的 `signal` 传给 Axios 的 `signal` 配置。

分页响应的 `data` 结构为 `{ current, pageSize, total, lists }`，可直接使用 `PaginatedData<T>` 类型。

## TanStack Query 约定

每个 feature 在自己的 hooks 中定义 query key：

```ts
export const productQueryKeys = {
  all: ['products'] as const,
  list: (params: ProductListParams) => [...productQueryKeys.all, 'list', params] as const,
}
```

页面通过 `useQuery` 消费 `data`、`isPending`、`isError` 和 `refetch`。服务端数据不要再复制一份到 Zustand。

## MSW 使用方式

- `src/mocks/data/`：可复用的类型化 mock 数据。
- `src/mocks/handlers.ts`：按真实 API 路径注册 `http.get/http.post` handler。
- `src/mocks/browser.ts`：创建浏览器 worker。
- `src/main.tsx`：开发环境且 `VITE_USE_MOCK_API=true` 时启动 worker。
- `public/mockServiceWorker.js`：MSW 生成的 worker 文件，升级 MSW 后使用 `pnpm exec msw init public/ --save` 更新。

新增接口时，先写真实 service，再添加同返回类型的 handler。例如 Dashboard 通过 `/dashboard/summary` 访问，开发时由 MSW 延迟 280ms 返回 mock，从而可以真实验证加载态和错误态 UI。

## 「用户与权限」模块契约（已实现）

### 接口一览

| Method   | Path                                                        | 说明（错误码为业务 code）                                                                      |
| -------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| POST     | `/auth/login`                                               | `{username,password}` → `AuthSession`；401 账号或密码错误；403 账号已停用 / 供应商账号请走门户 |
| POST     | `/auth/logout`                                              | 退出登录                                                                                       |
| GET      | `/auth/me`                                                  | 会话恢复；401 未登录或已过期                                                                   |
| PUT      | `/auth/profile`                                             | `{name,phone,email?}` → `CurrentUser`                                                          |
| PUT      | `/auth/password`                                            | `{oldPassword,newPassword}`；400 原密码不正确                                                  |
| GET/POST | `/system/user/page`、`/system/user`                         | 用户分页（keyword/status/roleCode/userType）/ 新建（4002 账号已存在）                          |
| PUT      | `/system/user/:id`、`/:id/password`、`/:id/status`          | 编辑（账号不可改）/ 重置密码（空 = 默认密码）/ 停用启用（4004 内置 admin 不可停用）            |
| GET/POST | `/system/role/page`、`/system/role/options`、`/system/role` | 角色分页（name/status）/ 启用角色下拉 / 新建（4002 编码重复）                                  |
| PUT      | `/system/role/:id`、`/:id/status`                           | 编辑（编码不可改）/ 停用启用（4003 内置角色不可停用）                                          |
| GET      | `/system/permission/tree`                                   | 全量权限树（菜单 → 按钮，key 即权限码）                                                        |
| GET/PUT  | `/system/role/:id/permissions`                              | 读取 / 保存角色权限码集合（`{permissionCodes}`）                                               |
| GET      | `/system/role/:id/users`                                    | 拥有该角色的用户                                                                               |
| GET      | `/system/operation-log/page`、`/options`                    | 日志分页（operator/module/时间范围/关键字）/ 筛选下拉                                          |

注意：**分页 `data.total` 是「总页数」不是总行数**，前端用 `toPaginationTotal(total, pageSize)` 换算后再交给 antd 分页，文案显示「共 N 页」。

### 演示账号

所有账号的密码均为 `123456`。账号体系：34 个用户 = 16 内部员工 + 18 供应商，与 6 个角色的用户数严格对账（见 `src/mocks/data/dataset.test.ts` 不变量测试）。

| 账号         | 角色           | 演示点                                           |
| ------------ | -------------- | ------------------------------------------------ |
| `admin`      | 管理员（内置） | 权限 `*` 全可见；不可被停用                      |
| `zhangwei`   | 采购员         | 无系统管理菜单；直接访问 `/system/user` 显示 403 |
| `chenjie`    | 财务（停用）   | 登录提示「账号已被停用」                         |
| `hongyuan01` | 供应商         | 管理端登录被拦截，提示走供应商门户               |

重置密码的默认新密码为 `Zq@20260920`（8-20 位且含字母数字，与前端校验规则一致）。

### 权限码约定

- 菜单码：`menu:<路径段以:连接>`，如 `/system/user` → `menu:system:user`，控制侧边栏显隐与路由访问（三层：AppSidebar 过滤 → `<RequirePermission>` 403 页 → 按钮条件渲染）；
- 按钮码：`<域>:<实体>:<动作>`，如 `system:user:create`；
- `*` 为全权通配，仅内置管理员持有；
- 权限树里的分组节点是 `group:` 前缀伪码，仅用于树结构展示，保存时会被过滤，不会进入权限集合；
- 角色权限保存后**下次登录生效**，不热更新当前会话。

### 会话与凭证

登录态由 Cookie 会话维持（`withCredentials`），前端**不向 localStorage 写入任何凭证**。Mock 用 `src/mocks/data/auth.ts` 的模块级 `mockSession` 模拟 Cookie：登录/`/auth/me` 成功时写入，logout 时清除；刷新页面由 `useAuthSession` 引导查询恢复。

### 导出 Excel 的过渡实现

操作日志的「导出 Excel」目前是前端把**当前页**数据导出为 CSV（`src/utils/csv.ts`，UTF-8 BOM 兼容 Excel，RFC 4180 转义）。后端提供导出接口后替换 `OperationLogPage` 里的 `handleExport` 即可，页面结构不变。
