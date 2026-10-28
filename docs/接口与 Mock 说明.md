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
- `src/mocks/handlers.ts`：按真实 API 路径注册 `http.get/http.post` handler。模式必须以 `*/api/` 开头（如 `*/api/product/:id`），不要写裸的 `*/product/:id`——MSW service worker 会拦截浏览器的一切请求（含 Vite 开发服务器的模块加载），裸模式会误匹配 `/src/**/product/*.tsx` 这类源码路径，导致页面模块收到 JSON 响应、动态 import 失败、整页白屏报错。
- `src/mocks/browser.ts`：创建浏览器 worker。
- `src/main.tsx`：开发环境且 `VITE_USE_MOCK_API=true` 时启动 worker。
- `public/mockServiceWorker.js`：MSW 生成的 worker 文件，升级 MSW 后使用 `pnpm exec msw init public/ --save` 更新。

新增接口时，先写真实 service，再添加同返回类型的 handler。例如 Dashboard 通过 `/dashboard/summary` 访问，开发时由 MSW 延迟 280ms 返回 mock，从而可以真实验证加载态和错误态 UI。

## 「用户与权限」模块契约（已实现）

### 接口一览

| Method   | Path                                                        | 说明（错误码为业务 code）                                                                                       |
| -------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| POST     | `/auth/login`                                               | `{username,password}` → `AuthSession`；401 账号或密码错误；403 账号已停用（供应商账号登录成功后按类型分流门户） |
| POST     | `/auth/logout`                                              | 退出登录                                                                                                        |
| GET      | `/auth/me`                                                  | 会话恢复；401 未登录或已过期                                                                                    |
| PUT      | `/auth/profile`                                             | `{name,phone,email?}` → `CurrentUser`                                                                           |
| PUT      | `/auth/password`                                            | `{oldPassword,newPassword}`；400 原密码不正确                                                                   |
| GET/POST | `/system/user/page`、`/system/user`                         | 用户分页（keyword/status/roleCode/userType）/ 新建（4002 账号已存在）                                           |
| PUT      | `/system/user/:id`、`/:id/password`、`/:id/status`          | 编辑（账号不可改）/ 重置密码（空 = 默认密码）/ 停用启用（4004 内置 admin 不可停用）                             |
| GET/POST | `/system/role/page`、`/system/role/options`、`/system/role` | 角色分页（name/status）/ 启用角色下拉 / 新建（4002 编码重复）                                                   |
| PUT      | `/system/role/:id`、`/:id/status`                           | 编辑（编码不可改）/ 停用启用（4003 内置角色不可停用）                                                           |
| GET      | `/system/permission/tree`                                   | 全量权限树（菜单 → 按钮，key 即权限码）                                                                         |
| GET/PUT  | `/system/role/:id/permissions`                              | 读取 / 保存角色权限码集合（`{permissionCodes}`）                                                                |
| GET      | `/system/role/:id/users`                                    | 拥有该角色的用户                                                                                                |
| GET      | `/system/operation-log/page`、`/options`                    | 日志分页（operator/module/时间范围/关键字）/ 筛选下拉                                                           |

注意：**分页 `data.total` 是「总页数」不是总行数**，前端用 `toPaginationTotal(total, pageSize)` 换算后再交给 antd 分页，文案显示「共 N 页」。

### 演示账号

所有账号的密码均为 `123456`。账号体系：34 个用户 = 16 内部员工 + 18 供应商，与 6 个角色的用户数严格对账（见 `src/mocks/data/dataset.test.ts` 不变量测试）。

| 账号         | 角色           | 演示点                                           |
| ------------ | -------------- | ------------------------------------------------ |
| `admin`      | 管理员（内置） | 权限 `*` 全可见；不可被停用                      |
| `zhangwei`   | 采购员         | 无系统管理菜单；直接访问 `/system/user` 显示 403 |
| `chenjie`    | 财务（停用）   | 登录提示「账号已被停用」                         |
| `hongyuan01` | 供应商         | 登录后按类型分流至供应商门户（见下文门户模块）   |

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

## 「采购申请」模块契约（已实现）

覆盖「创建采购申请 → 提交审批 → 撤回 / 重提」闭环。页面为「列表 / 表单 / 详情」四态页内切换（新建与编辑共用表单视图）；状态筛选由列表页签承载（全部 / 草稿 / 待审批 / 已通过 / 已拒绝 / 已生成订单）。状态机 `draft → pending → approved / rejected → ordered` **一律由服务端业务动作驱动，前端不可直接写 status**：提交（draft/rejected → pending）、撤回（pending → draft，清空提交时间）、删除（仅 draft）；已通过 → 生成订单、已生成订单 → 查看订单均深链跳转采购订单页（见下节）。审批流水随详情接口返回（时间正序），「通过 / 拒绝」结论由审批中心模块的裁决接口写入（见下节）。

### 接口一览

| Method     | Path                                          | 说明（错误码为业务 code）                                                                                                                         |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET        | `/purchase/request/next-code`                 | 预览将分配的申请编号（`PR`+当天日期+4 位流水，全局递增；新建表单展示，创建时服务端最终生成）                                                      |
| GET/POST   | `/purchase/request/page`、`/purchase/request` | 分页（keyword 匹配编号/主题、status、applicantId、submittedFrom/To——草稿无提交时间，设了范围即不参与）/ 新建（默认草稿态，申请人 = 当前登录用户） |
| PUT/DELETE | `/purchase/request/:id`                       | 编辑 / 删除（仅 draft、rejected 可编辑，仅 draft 可删除，否则 4502；明细整体提交覆盖）                                                            |
| POST       | `/purchase/request/:id/submit`                | 提交审批（draft/rejected → pending，重提时流水记 `resubmit`；4502 状态不允许）                                                                    |
| POST       | `/purchase/request/:id/withdraw`              | 撤回（pending → draft，清空 submittedAt，流水记 `withdraw`；4502 状态不允许）                                                                     |
| GET        | `/purchase/request/:id`                       | 详情（含 approvalRecords 审批流水，时间正序；4501 不存在）                                                                                        |
| GET        | `/product/options`                            | 启用商品下拉（id/编码/名称/规格/单位/采购参考价/安全库存/总库存），表单选品与预警带入共用，缓存 5 分钟                                            |

金额口径：行金额 = 数量 × 参考价（两位小数四舍五入），预计总金额 = Σ 行金额，**均由服务端计算**；商品档案字段（编码/名称/规格/单位）提交时由服务端按 productId 快照，商品改名不影响历史单据。

### 错误码分段

- `45xx` 采购申请：4501 不存在、4502 状态不允许该操作、4503 明细不合法（空明细 / 数量非正整数 / 单价为负 / 商品不存在或停用 / 商品重复）；
- 通用段沿用 `40xx`（4001 参数缺失、4002 重复）。

### 权限码

- 菜单：`menu:purchase:request`；
- 按钮：`purchase:request:{create,update,submit,withdraw,delete,generate-order}`；
- admin 持 `*`；采购员预置除 `generate-order` 外全部；行内操作按状态机 × 权限码双重收敛，查看对所有角色开放。

### 演示数据约定

- 申请 12 条覆盖全部状态：草稿 2（含一条「提交后撤回」回草稿的完整流水）/ 待审批 4 / 已通过 2 / 已拒绝 2（附审批意见）/ 已生成订单 2（关联演示订单号 `PO…`）；
- 编号 `PR`+创建日期+4 位流水，按创建日期递增（09-05 起），申请人从内部员工数据集取（张伟/林敏/赵磊/刘洋）；
- 明细引用商品数据集真实商品，参考价取采购参考价；含「打印纸」「硒鼓」等与库存预警联动的场景条目；
- 审批流水由生命周期种子确定性展开（create 当点 → submit +2h → 结论 +22h → 撤回 +26h），结论审批人按 管理员/王芳/钱峰/周宇 轮换；
- 数据集不变量见 `src/mocks/data/dataset.test.ts`（状态分布、编码规则、金额口径、流水一致性）。

### 需求偏差记录

1. 申请主题 / 期望到货日期 / 提交时间为原型扩表字段（数据库设计仅 code/applicant/department/reason/total_amount/status）；
2. 状态筛选以页签承载（原型同时有页签与状态下拉，取页签去重），页签不带数量角标（避免额外统计契约）；
3. 「生成订单 / 查看订单」已由采购订单模块兑现（见下节）：按 `orderedOrderId / orderedOrderCode` 深链跳转，不再是占位提示；
4. 审批「通过 / 拒绝」动作已由审批中心模块兑现（见下节），种子数据中的结论仍为演示数据；
5. 列表行内联全部明细为 MVP 简化（演示数据量小，真实后端接入时再拆「明细条数投影」）；
6. 申请人固定为当前登录用户（原型口径，暂不支持代提）；部门随申请人档案快照。

## 「审批中心」模块契约（已实现）

覆盖路线图第 5 步：单级审批（通过 / 拒绝）、审批记录、状态跟踪（多级审批留待第二阶段）。所有持审批权限的用户共享同一待办池，**先到先审**——并发裁决由服务端状态校验兜底，单据已非待审批时返回 4502「该单据已被处理」。页面两处：**我的审批**（待办列表 + 详情内嵌裁决面板，详情复用采购申请详情视图）、**我已审批**（本人结论列表 + 只读详情）。侧边栏「我的审批」注入待办数徽标，裁决 / 提交 / 撤回后随查询失效即时刷新。

### 接口一览

| Method | Path                            | 说明（错误码为业务 code）                                                                                                                                 |
| ------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/approval/pending-page`        | 待办分页：仅 pending 单据的展示投影（编号/主题/申请人/部门/金额/提交时间），按提交时间**升序**（先到先审）；筛选 keyword / applicantId / submittedFrom-To |
| GET    | `/approval/processed-page`      | 我已审批分页：当前登录人名下 approve/reject 流水 join 单据投影，按结论时间倒序；筛选 keyword / action / processedFrom-To                                  |
| GET    | `/approval/pending-count`       | 待办计数（侧边栏徽标；延迟刻意压短，便于随失效高频刷新）                                                                                                  |
| POST   | `/purchase/request/:id/approve` | 通过：pending → approved，意见选填；4501 不存在、4502 已被处理                                                                                            |
| POST   | `/purchase/request/:id/reject`  | 拒绝：pending → rejected，意见必填（缺失 4001）；4501 / 4502 同上                                                                                         |

裁决动作挂在业务资源路径 `/purchase/request/:id/*` 下（单据归属），由审批中心模块的 service 调用；写入结论流水（operator = 当前登录审批人）并记「审批中心」审计日志（审批通过 / 审批拒绝），采购申请详情时间线随流水即时可见。

### 错误码分段

- 沿用 `45xx` 采购申请段：4501 单据不存在、4502 单据已被处理（先到先审竞态兜底，前端提示刷新列表）；
- 通用段沿用 `40xx`：4001 拒绝意见缺失。

### 权限码

- 菜单：`menu:approval:pending`、`menu:approval:processed`；
- 按钮：`approval:pending:approve`、`approval:pending:reject`；
- admin 持 `*`；审批人角色预置上述全部；待办徽标仅在持 `menu:approval:pending` 时拉取计数。

### 演示数据约定

- 结论流水种子 6 条（通过 4 / 拒绝 2），结论审批人按 管理员/王芳/钱峰/周宇 轮换，保证 admin 登录后「我已审批」有数据可看；
- 不变量见 `src/mocks/data/dataset.test.ts`「审批中心数据集不变量」：结论人非申请人、结论与单据状态自洽、admin 名下有结论、拒绝必附意见。

### 需求偏差记录

1. 数据库设计仅有 `approval_record` 结论表；实现同时保留过程动作流水（创建/提交/撤回/重提），供详情时间线展示（同一张流水表，靠 action 区分）；
2. 拒绝意见必填、通过意见选填（需求未明确通过是否必填，取宽松口径）；
3. 「该单据已被处理」先到先审竞态以 4502 业务码兜底；详情裁决面板自带状态守卫，单据已非待审批时降级为失效提示；
4. 「待办数量高亮」落地为侧边栏「我的审批」菜单项徽标（`pending-count` 接口驱动）；
5. 审批中心按信息架构独立成一级菜单组（我的审批 / 我已审批），需求的审批操作页落在「我的审批 → 去审批」详情内；
6. 我已审批列表的结论 / 结论时间筛选为前端补充（需求仅给字段清单）。

## 「采购订单」模块契约（已实现）

覆盖路线图第 6 步：从已通过申请**生成订单**（带入明细、选供应商、确认成交单价与交货要求）、草稿编辑、发送供应商、拒绝后重发与作废。页面为「列表 / 表单 / 详情」四态页内切换，**视图态由 URL 查询参数驱动**（`?action=create[&fromRequest=…]`、`?action=edit&id=…`、`?action=detail&id=…`），使采购申请页的「生成订单 / 查看订单」可以直接深链跳入。状态机 `draft → pending_supplier → confirmed → shipped → received → inspected → completed`，`pending_supplier` 可被供应商拒绝 → `rejected`（可重发或作废）——**状态一律由服务端业务动作驱动，前端不可直接写 status**；供应商确认 / 拒绝 / 发货属供应商端模块，收货 / 验收 / 付款结清属收货验收与付款模块，本模块对这些状态只读展示。

### 接口一览

| Method | Path                        | 说明（错误码为业务 code）                                                                                                                             |
| ------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/purchase/order/next-code` | 预览将分配的订单编号（`PO`+当天日期+4 位流水，全局递增；新建表单展示，创建时服务端最终生成）                                                          |
| GET    | `/purchase/order/page`      | 分页：keyword 匹配订单编号 / 来源申请编码、status、supplierId、createdFrom/To（创建日期含边界）                                                       |
| POST   | `/purchase/order`           | 新建草稿；携带 `requestId` 即「从申请生成」——校验申请为已通过（否则 4605）并联动置为「已生成订单」+ 写投影；供应商不存在 / 停用 4604，明细不合法 4603 |
| PUT    | `/purchase/order/:id`       | 编辑（仅 draft，否则 4602；明细整体替换；来源申请创建后不可更换，载荷中的 requestId 被忽略）                                                          |
| DELETE | `/purchase/order/:id`       | 删除草稿（仅 draft）；来源申请联动回退「已通过」并清空投影，可重新生成订单                                                                            |
| POST   | `/purchase/order/:id/send`  | 发送供应商：draft 首发 / rejected 重发 → pending_supplier（写 sentAt；重发清空上轮拒绝结论）                                                          |
| POST   | `/purchase/order/:id/void`  | 作废：pending_supplier / rejected → cancelled（终态），原因必填（缺失 4001）；来源申请联动回退「已通过」                                              |
| GET    | `/purchase/order/:id`       | 详情（含状态时间戳；详情页时间线由前端按状态机派生，服务端不单独维护流水表）                                                                          |
| GET    | `/supplier/options`         | 启用供应商下拉（订单选商与列表筛选共用；与商品 options 同款缓存 5 分钟）                                                                              |

金额口径与申请侧一致：行金额 = 数量 × 成交单价（两位小数四舍五入），订单总额 = Σ 行金额，**均由服务端计算**；商品 / 供应商名称保存时由服务端快照，改名不影响历史单据。生成订单后申请侧状态翻转（approved → ordered）与投影写入（orderedOrderId / orderedOrderCode）由订单接口联动完成，同一申请无法重复生成（再次生成命中 4605）。

### 错误码分段

- `46xx` 采购订单：4601 不存在、4602 状态不允许该操作、4603 明细不合法（空明细 / 数量非正整数 / 单价为负 / 商品不存在或停用 / 商品重复）、4604 供应商不可用（不存在或已停用）、4605 来源申请不可用（不存在或非已通过状态）；
- 通用段沿用 `40xx`（4001 参数缺失——作废原因等）。

### 权限码

- 菜单：`menu:purchase:order`；
- 按钮：`purchase:order:{update,send,delete,void}`；
- admin 持 `*`；采购员预置上述全部；「新建 / 从申请生成」沿用 `purchase:request:generate-order`（生成动作归属申请侧权限，未单设 `purchase:order:create`）；行内操作按状态机 × 权限码双重收敛，查看对所有角色开放。

### 演示数据约定

- 订单 10 条覆盖全部状态：草稿 1 / 待供应商确认 1 / 已确认 2 / 已发货 1 / 已收货 1 / 已验收 1 / 已完成 1 / 已拒绝 1 / 已作废 1；编号 `PO`+创建日期+4 位流水，全局随创建日期递增（09-06 起）；
- 「已生成订单」申请（2 条）的订单由申请种子**派生**：编码 / 明细 / 金额取自申请（成交价 = 参考价），创建时间 = 申请审批通过后 2 小时；申请与订单的投影字段（`orderedOrderId/Code` ↔ `requestCode`）双向一致，派生订单的采购员 = 申请人；
- 其余 8 条为**线下补录订单**（requestId 为空，数据库设计允许 `request_id NULL`），明细引用真实商品、成交价默认取采购参考价，已完成单含一笔议价演示（A4 复印纸 125/箱）；
- 生命周期时间由「创建时间 + 小时偏移」确定性生成；已拒绝 / 已作废终态成对携带时间与原因；生命周期推进（发货 / 收货 / 验收 / 完成）的写入口在供应商端、收货验收与付款模块落地时接入；
- 供应商「在途订单数」由订单数据集回写（待供应商确认 + 已确认 + 已发货），不再是静态投影；
- 数据集不变量见 `src/mocks/data/dataset.test.ts`「采购订单数据集不变量」（状态分布、编码规则、派生一致性、生命周期自洽、在途数回写）。

### 需求偏差记录

1. `cancelled`（已作废）为扩表状态：数据库状态机仅到 rejected（「可重发/作废」），作废需要终态承载，故增补 cancelled 并记录于此；
2. 来源申请可空（线下订单补录）：数据库 `request_id` 允许 NULL，需求页面清单未定义补录入口，为跑通「无申请直采」场景与演示数据丰富度保留；
3. 删除草稿 / 作废联动来源申请回退「已通过」并清空投影——需求未明确该联动，取「可重新生成订单」口径（呼应需求「供应商拒绝后可重新选供应商 / 重新发送 / 作废」）；
4. 供应商确认 / 拒绝 / 发货、收货 / 验收、付款结清的推进动作分属供应商端、收货验收与付款模块，本模块状态列与时间线只读展示；详情「关联单据」区在对应模块上线前显示占位；
5. 新建 / 从申请生成沿用 `purchase:request:generate-order` 权限码，未单设 `purchase:order:create`（生成动作归属申请侧）；
6. 订单列表 / 详情暂不提供跳转申请详情的反向深链（申请页视图态为域内 state，不支持查询参数直达；后续申请页参数化后再放开）。

## 「供应商门户」模块契约（已实现）

覆盖路线图第 7 步：供应商登录、查看订单、确认 / 拒绝、发货。同一登录页按 `userType` 分流——供应商登录成功后前端跳转 `/supplier-portal`，管理端路由与门户路由互斥（`RequireUserType` 类型门卫：供应商访问管理端路由、内部员工访问门户路由均重定向回各自首页）。门户为独立外壳（绿色主题顶栏 + 横向导航：首页 / 我的采购订单 / 待发货 / 发货记录），**视图态由 URL 查询参数驱动**（`?action=detail&id=…`、`?action=ship&id=…`，支持首页「去处理」、列表「填写发货」深链）。状态机推进 `pending_supplier → confirmed / rejected`、`confirmed → shipped`——**状态一律由服务端业务动作驱动**，每次动作同步回写供应商档案的待确认 / 待发货数与审计日志；采购方侧（收货 / 验收 / 付款结清）属收货验收与付款模块，门户对 shipped 之后的状态只读展示。

### 接口一览

| Method | Path                        | 说明（错误码为业务 code）                                                                                                                    |
| ------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/portal/summary`           | 首页统计：我的订单数 / 待确认 / 待发货 / 本月发货（待确认 + 待发货由订单状态实时聚合，非档案静态投影）                                       |
| GET    | `/portal/order/page`        | 我的采购订单分页：keyword 匹配订单编号、status、createdFrom/To；**supplierId 由服务端按会话注入，前端无该参数**                              |
| GET    | `/portal/order/:id`         | 订单详情（4701 不存在或不属于当前供应商）                                                                                                    |
| POST   | `/portal/order/:id/confirm` | 确认订单：pending_supplier → confirmed，预计发货时间选填（回写订单 `promisedShipDate`）；4702 状态不允许                                     |
| POST   | `/portal/order/:id/reject`  | 拒绝订单：pending_supplier → rejected，原因必填（4001 缺失），回写订单 `rejectReason` 供采购员查看；4702 同上                                |
| POST   | `/portal/order/:id/ship`    | 发货：confirmed → shipped，生成发货单并回写订单 shippedAt；返回 `{order, shipment}` 供前端双单据号一并提示；明细必须覆盖订单全部商品（4703） |
| GET    | `/portal/shipment/page`     | 发货记录分页：keyword 匹配发货单号 / 关联订单号                                                                                              |

所有 `/portal/*` 接口均要求供应商会话：401 未登录、403 非供应商账号、4704 供应商档案缺失或停用（档案被管理端停用后门户整体不可用）。分页口径同前（`data.total` 为总页数）。

### 错误码分段

- `47xx` 门户：4701 单据不存在或不属于当前供应商、4702 状态不允许该操作、4703 发货明细不合法（空明细 / 含非本单商品 / 商品重复 / 数量非 1~订购数的整数 / 未覆盖全部商品）、4704 供应商档案缺失或停用；
- 通用段沿用 `40xx`（4001 参数缺失——拒绝原因等）。

### 权限码

- 菜单：`menu:supplier-portal:{home,my-orders,to-ship,shipments}`（供应商角色预置）；
- 按钮：`supplier-portal:order:{confirm,reject,ship}`（供应商角色预置，行内操作按状态机 × 权限码双重收敛）；
- admin 持 `*` 但 `userType` 为内部员工，会被路由类型门卫拦在门户之外——**类型门卫优先于权限码**；供应商角色不含任何管理端菜单码，同理进不了管理端。

### 演示数据约定

- 演示账号 `hongyuan01 / 123456`（杭州宏远纸业，sup-001）：登录后直达门户首页，四张统计卡片与「待处理订单」预览均有数据；
- 采购订单数据集增至 13 条：为 sup-001 新增 3 条（待确认 2026-10-14 / 已确认 2026-10-18 / 已发货 2026-10-08），加上原有 1 条已完成，覆盖门户全部演示状态；编号仍按创建日期全局递增，与既有 10 条不冲突；已发货单落在当月（10 月），保证「本月发货」非零；
- 发货单由已发货订单**派生**（1:1，MVP 一次发清）：编码 `SH`+发货日期+4 位流水，实发数量 = 订购数量，物流公司 / 单号取种子映射（顺丰 / 德邦 / 京东）；新增发货（门户发货动作）的编码全局递增（`nextShipmentCode`）；
- 数据集不变量见 `src/mocks/data/dataset.test.ts`「门户演示账号」与「发货单数据集不变量」（发货单 ↔ 已发货订单 1:1、编码规则、实发快照、供应商快照）。

### 需求偏差记录

1. 需求的「供应商独立登录入口」落地为统一登录页按 `userType` 分流（同一账号体系，登录成功后前端跳转门户）；
2. 供应商与订单的归属以 `suppliers.portalUsername === session.user.username` 关联（真实设计为 user.supplier_id 外键），后端落地时应改为外键口径；
3. 发货数量可按商品调整（1 ~ 订购数，默认 = 订购数），但 MVP 一次发清、不跟踪部分发货多次——发货单与订单 1:1；
4. 发货单无独立详情接口，记录列表以展开行承载明细（订购 / 实发对照）；
5. 门户顶栏仅「退出登录」，无个人中心（供应商资料由管理端供应商档案维护）；
6. `promisedShipDate`（供应商预计发货时间）为门户确认动作的扩展字段，挂在采购订单实体上（数据库订单表未含此列）；
7. 管理端采购订单详情的「关联单据」暂不展示发货单（内部订单详情与门户发货记录尚未互链，收货模块落地时一并接入）。

## 「收货与验收」模块契约（已实现）

覆盖路线图第 8 步：收货登记、验收确认、合格数量入库。单据为**预建口径**——供应商发货即预建「待收货」收货单（与数据库 `receipt.status` 默认 pending 一致），仓库确认收货即预建「待验收」验收单（`inspection.result` 默认 pending），列表天然承载「待收货 / 待验收」工作台。页面两个：**收货单**（待收货 / 已收货页签 + 确认收货视图 + 详情视图）与**验收单**（待验收 / 已验收页签 + 验收操作视图 + 详情视图），视图态由 URL 查询参数驱动（`?action=confirm|inspect|detail&id=…`）。状态机推进 `pending → received`、`pending → qualified / partial / unqualified`——**状态一律由服务端业务动作驱动**，并联动推进采购订单（shipped → received → inspected）与操作日志（receiving 模块）。

### 接口一览

| Method | Path                                  | 说明（错误码为业务 code）                                                                                                                                                  |
| ------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/receiving/receipt/page`             | 收货单分页：keyword 匹配收货单号 / 关联订单号、status（pending/received）、supplierId、orderId（关联单据联查）、createdFrom/To                                             |
| GET    | `/receiving/receipt/:id`              | 收货单详情（含应发 / 实收明细与验收单投影）                                                                                                                                |
| POST   | `/receiving/receipt/:id/confirm`      | 确认收货：登记实收数量（1 ~ 应发，允许少收不可超收，明细必须覆盖全部商品）+ 备注选填；生成待验收单并回写投影，订单 → 已收货（在途数联动刷新）                              |
| GET    | `/receiving/inspection/page`          | 验收单分页：keyword 匹配验收单号 / 收货单号 / 订单号、result（pending/qualified/partial/unqualified/**settled**——三种已验收结论的合并口径）、supplierId、orderId、时间范围 |
| GET    | `/receiving/inspection/:id`           | 验收单详情（含订单数量 / 实收 / 合格 / 不合格明细对照）                                                                                                                    |
| POST   | `/receiving/inspection/:id/submit`    | 提交验收：逐行合格 + 不合格数量（强校验合格 + 不合格 = 实收、覆盖全部商品），结论由服务端按明细汇总判定；订单 → 已验收                                                     |
| GET    | `/receiving/order/:orderId/documents` | 采购订单关联单据联查：`{receipt, inspection}`，未生成时对应字段为 null（订单详情「关联单据」区使用）                                                                       |

`data.total` 为总页数（分页口径同前）。确认收货会消化一条在途订单，供应商列表「在途订单数」随之刷新（复用 `syncSupplierPendingOrderCounts`）；门户「填写发货」动作同步预建待收货单，保证「发货单 : 收货单 = 1:1」在运行期同样成立。

### 错误码分段

- `48xx` 收货与验收：4801 单据不存在、4802 状态不允许该操作（单据提交后不可修改，冲正 / 退货归第二阶段）、4803 收货明细不合法（空明细 / 含非本单商品 / 商品重复 / 数量非 1~应发的整数 / 未覆盖全部商品）、4804 验收明细不合法（空明细 / 商品不匹配 / 数量须为非负整数 / **合格 + 不合格 ≠ 实收** / 未覆盖全部商品）；
- 通用段沿用 `40xx`（4001 参数缺失）。

### 权限码

- 菜单：`menu:receiving:receipt`、`menu:receiving:inspection`（仓库人员 + 采购员预置——采购员按需求只读跟踪进度，无动作码）；
- 按钮：`receiving:receipt:confirm`（确认收货）、`receiving:inspection:submit`（提交验收），仅仓库人员角色预置；
- admin 持 `*`；确认收货 / 提交验收入口按 状态机 × 按钮权限码 双重收敛（无权限时可看不可操作，输入框与提交按钮禁用并给出提示）。

### 演示数据约定

- 收货单 5 张由发货单派生（1:1）：po-001（已收货待验收）/ po-003（已收货 + 全部合格）/ po-006（已收货 + 部分合格，含 2 件破损演示）/ po-007、po-009（待收货工作台演示）；编码 `RC`+单据日期（= 发货时间）+4 位流水；
- 验收单 3 张由已收货单派生：po-003 全部合格、po-006 部分合格（第 1 行 40 收 38 合格 2 不合格）、po-001 待验收（数量 0/0 待登记）；编码 `IS`+单据日期（= 收货时间）+4 位流水；
- MVP 一次收清：种子实收数量 = 应发数量（少收场景由确认收货动作演示）；收货人 / 验收人按仓储部 吴军 / 冯逸 / 高帆 轮换；
- 仓库演示账号（如 `wujun / 123456`）登录后可见「收货与验收」菜单并执行两个动作；采购员（zhangwei）可见菜单但动作码为空；
- 数据集不变量见 `src/mocks/data/dataset.test.ts`「收货与验收数据集不变量」（收货单 ↔ 发货单 1:1、验收单 ↔ 已收货单 1:1、编码规则、状态与订单时间戳自洽、合格 + 不合格 = 实收、结论分布）。

### 需求偏差记录

1. 单据为**预建**口径（发货即有待收货单、收货即有待验收单）：需求流程图写作「确认收货时生成收货单」，但数据库设计的 pending 默认状态与「验收单列表需展示待验收」的页面要求只有预建能同时满足，取数据库口径并记录于此；
2. **合格数量入库为演示契约**：库存模块（路线图第 9 步）落地后，验收提交将在服务端写入 `inventory_transaction`（类型=入库）并更新 `inventory`，本模块当前仅记录验收结论；
3. 不合格数量由前端按「实收 − 合格」派生展示（单输入框），提交载荷仍按数据库口径传合格 / 不合格两个字段，服务端强校验之和等于实收；
4. 验收单列表的「已验收」页签为 settled 合并口径（三种结论一个页签，结论列展示具体值），避免页签枚举爆炸；
5. 收货单筛选含供应商下拉（需求页面清单有供应商筛选）；验收单列表需求未定义筛选项，实现补充了关键字 + 单据时间范围；
6. 收货 / 验收操作人仅记录展示名（真实设计为 received_by / inspected_by 外键 + 联查用户表）；
7. 采购订单详情「关联单据」区已接入收货单 / 验收单（第 6 步偏差记录第 4 条部分兑现），发货单仍仅在门户展示、付款记录待付款模块落地后接入；
8. 部分收货多次执行、质检标准、附件上传、退货冲正、到货超期提醒按需求明确不做（第二阶段）。
