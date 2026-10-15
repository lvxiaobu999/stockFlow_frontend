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

## 「基础资料」模块契约（已实现）

覆盖四个子域：**商品分类 / 商品档案 / 供应商档案 / 仓库档案**。页面模式：分类页为「左树 + 右商品联动表」，商品与供应商为「列表 / 表单 / 详情」三态页内切换，仓库为「列表 / 表单」两态。编码一律**服务端生成、创建后不可修改**，新建表单展示实时预取的下一编码。

### 接口一览

| Method   | Path                                                            | 说明（错误码为业务 code）                                                                                  |
| -------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| GET      | `/product/category/next-code?parentId=`                         | 预览将分配的分类编码（随所选上级变化；parentId 空 = 顶级）                                                 |
| GET/POST | `/product/category/list`、`/product/category`                   | 全量分类扁平列表（树由前端构建）/ 新建（4002 同级重名；4104 上级不存在、已停用或层级已满）                 |
| PUT      | `/product/category/:id`、`/:id/status`                          | 编辑（编码不可改；上级不可选自身/子孙 4104）/ 停用启用                                                     |
| DELETE   | `/product/category/:id`                                         | 删除（4102 存在子分类；4103 子树内存在商品）                                                               |
| GET      | `/product/next-code`、`/product/page`                           | 商品编码预取 / 分页（keyword/categoryId/status/stockBelowSafety；**categoryId 匹配该分类及其全部子分类**） |
| POST/PUT | `/product`、`/product/:id`、`/:id/status`                       | 新建（4203 所属分类停用或不存在；初始库存 0）/ 编辑（编码不可改）/ 停用启用                                |
| GET      | `/product/:id`、`/:id/stock-summary`、`/:id/stock-transactions` | 详情 / 库存汇总（按仓库）/ 最近流水——**库存模块落地前的演示契约**                                          |
| GET/POST | `/supplier/page`、`/supplier`                                   | 分页（keyword/status/inTransit）/ 新建（4302 名称重复；不联动开户）                                        |
| PUT      | `/supplier/:id`、`/:id/status`                                  | 编辑（编码不可改）/ 停用启用（无删除接口，预留 4303）                                                      |
| GET      | `/supplier/:id`、`/:id/recent-orders`                           | 详情 / 近 5 笔订单——**采购模块落地前的演示契约**                                                           |
| GET/POST | `/inventory/warehouse/page`、`/inventory/warehouse`             | 分页（keyword/status）/ 新建（4402 名称重复；初始统计为 0）                                                |
| PUT      | `/inventory/warehouse/:id`、`/:id/status`                       | 编辑（编码不可改）/ 停用启用（**4403 总仓不允许停用**）                                                    |
| GET      | `/system/user/staff-options`                                    | 启用内部员工下拉（仓库负责人选择），`useStaffOptions` 缓存 5 分钟                                          |

分页口径同上（`data.total` 为总页数）。

### 错误码分段

- `41xx` 分类：4101 不存在、4102 有子分类、4103 有商品、4104 上级不合法；
- `42xx` 商品：4201 不存在、4203 所属分类停用/不存在；
- `43xx` 供应商：4301 不存在、4302 名称重复；
- `44xx` 仓库：4401 不存在、4402 名称重复、4403 总仓不可停用；
- `40xx` 通用：4001 参数缺失、4002 重复。

### 权限码

- 分类：`product:category:{create,update,delete,toggle-status}`（仅管理员预置）；
- 商品：`product:list:{create,update,toggle-status,export}`（仅管理员预置）；
- 供应商：`supplier:list:{create,update,toggle-status,export}`（采购员预置前三个）；
- 仓库：`inventory:warehouse:{create,update,toggle-status}`（仓管员预置）；
- 商品无删除入口（只停用）；供应商、仓库同样无删除入口。

### 演示数据约定

- 分类 18 节点、层级段式编码（`010000` → `010100` → `010101`），`铅笔` 为可删除的停用演示节点；
- 商品 30 条：8 条库存预警、3 条停用，覆盖 10 个分类与 个/箱/盒/提/套 五种单位；
- 供应商 16 家：14 家开通门户账号（与用户表供应商账号按名称一对一关联）、3 家停用；
- 仓库 5 个：总仓（内置、不可停用）+ 上海/北京/广州 + 深圳仓（停用、零库存）；
- 商品「库存汇总/最近流水」、供应商「近 5 笔订单」、仓库统计三列为**演示契约**，由库存、采购模块兑现后替换。

### 需求偏差记录

1. 仓库字段按原型扩表（负责人/联系电话/地址/统计列），数据库设计仅 code/name/status/remark 四字段；
2. 商品规格、采购参考价按原型必填（数据库允许 NULL）；编码格式采用数据库建议（分类段式 / `SP`+日期+流水 / `SUP`+流水 / `WH`+流水）；
3. 商品主图以 base64 存内存，**仅会话期内存活**，刷新后丢失，等待后端文件上传接口；
4. 分类/商品写操作仅管理员可用（无「商品管理员」预置角色）；总仓不可停用为前端约定，待后端最终确认；
5. 商品列表 `categoryId` 筛选语义为「所选分类及其全部子分类」，与分类树 productCount 的子树口径一致。
