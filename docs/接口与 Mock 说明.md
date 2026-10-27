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

## 「采购申请」模块契约（已实现）

覆盖「创建采购申请 → 提交审批 → 撤回 / 重提」闭环。页面为「列表 / 表单 / 详情」四态页内切换（新建与编辑共用表单视图）；状态筛选由列表页签承载（全部 / 草稿 / 待审批 / 已通过 / 已拒绝 / 已生成订单）。状态机 `draft → pending → approved / rejected → ordered` **一律由服务端业务动作驱动，前端不可直接写 status**：提交（draft/rejected → pending）、撤回（pending → draft，清空提交时间）、删除（仅 draft）；已通过 → 生成订单属采购订单模块，本模块仅留动作占位。审批流水随详情接口返回（时间正序），「通过 / 拒绝」结论由审批中心模块的裁决接口写入（见下节）。

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
3. 「生成订单 / 查看订单」为采购订单模块落地前的占位动作，页面点击提示模块未上线；`orderedOrderCode` 仅为演示投影；
4. 审批「通过 / 拒绝」动作已由审批中心模块兑现（见下节），种子数据中的结论仍为演示数据；
5. 列表行内联全部明细为 MVP 简化（订单模块落地时改为明细条数投影）；
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
