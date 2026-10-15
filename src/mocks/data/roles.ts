import type { PermissionNode, RoleBrief, RoleRecord } from '@/features/system/types'

/** 由角色编码构造展示用简要信息；未知编码回退为编码本身，避免出现空标签。 */
export function toRoleBrief(code: string): RoleBrief {
  const role = roleMock.find((item) => item.code === code)
  return { code, name: role?.name ?? code }
}

/**
 * 角色 Mock 数据：MVP 固定 6 个内置角色（与需求文档《需求二次审查》P1.3 一致）。
 * userCount 字段在 handler 里按用户数据实时计算，这里的值仅作占位兜底。
 */
export const roleMock: RoleRecord[] = [
  {
    id: 'role-admin',
    code: 'admin',
    name: '管理员',
    description: '系统最高权限，可管理用户、角色与全部业务',
    userCount: 1,
    status: 1,
    builtin: true,
    updatedAt: '2026-06-01 10:00:00',
  },
  {
    id: 'role-purchaser',
    code: 'purchaser',
    name: '采购员',
    description: '创建采购申请与订单，跟踪到货进度',
    userCount: 4,
    status: 1,
    updatedAt: '2026-08-05 11:20:00',
  },
  {
    id: 'role-approver',
    code: 'approver',
    name: '审批人',
    description: '审批采购申请，填写审批意见',
    userCount: 3,
    status: 1,
    updatedAt: '2026-08-05 11:20:00',
  },
  {
    id: 'role-warehouse',
    code: 'warehouse',
    name: '仓库人员',
    description: '确认收货、执行验收、维护库存',
    userCount: 6,
    status: 1,
    updatedAt: '2026-07-18 09:05:00',
  },
  {
    id: 'role-finance',
    code: 'finance',
    name: '财务',
    description: '对账确认、付款记录管理',
    userCount: 2,
    status: 1,
    updatedAt: '2026-07-18 09:05:00',
  },
  {
    id: 'role-supplier',
    code: 'supplier',
    name: '供应商',
    description: '供应商门户登录，确认订单与发货',
    userCount: 18,
    status: 1,
    builtin: true,
    updatedAt: '2026-06-01 10:00:00',
  },
]

/**
 * 各角色的默认权限码集合（权限树的初始勾选状态）。
 * admin 持有 '*' 通配；supplier 本期仅保留工作台（供应商门户属后续模块）。
 * 保存角色权限后，handler 会把新集合写回这里，会话期内保持一致。
 */
export const rolePermissionCodes: Record<string, string[]> = {
  admin: ['*'],
  purchaser: [
    'menu:dashboard',
    'menu:purchase:request',
    'purchase:request:create',
    'purchase:request:update',
    'purchase:request:submit',
    'purchase:request:generate-order',
    'menu:purchase:order',
    'purchase:order:update',
    'purchase:order:send',
    'menu:product:category',
    'menu:product:list',
    'menu:supplier:list',
    'menu:receiving:receipt',
    'menu:receiving:inspection',
    'menu:inventory:current-stock',
    'menu:inventory:stock-transactions',
    'menu:inventory:stock-alert',
    'inventory:stock-alert:create-request',
  ],
  approver: [
    'menu:dashboard',
    'menu:approval:pending',
    'approval:pending:approve',
    'approval:pending:reject',
    'menu:approval:processed',
    'menu:purchase:request',
    'menu:reconciliation:list',
  ],
  warehouse: [
    'menu:dashboard',
    'menu:receiving:receipt',
    'menu:receiving:inspection',
    'menu:inventory:warehouse',
    'menu:inventory:current-stock',
    'menu:inventory:stock-transactions',
    'menu:inventory:stock-alert',
    'menu:purchase:order',
  ],
  finance: [
    'menu:dashboard',
    'menu:reconciliation:list',
    'menu:reconciliation:pending-pool',
    'menu:reconciliation:overview',
    'menu:payment:pending',
    'menu:payment:records',
    'menu:report:dashboard',
    'menu:report:purchase-summary',
    'menu:report:payable',
  ],
  supplier: ['menu:dashboard'],
}

/**
 * 权限树：镜像真实侧边栏导航（config/navigation.tsx）的全量菜单，
 * 分组节点使用 group: 前缀的伪权限码（仅用于树结构，保存时会过滤掉）；
 * 有操作动作的页面在菜单节点下挂按钮节点，key 即按钮权限码。
 */
export const permissionTreeMock: PermissionNode[] = [
  { key: 'menu:dashboard', title: '工作台', type: 'menu' },
  {
    key: 'group:inventory',
    title: '库存管理',
    type: 'menu',
    children: [
      { key: 'menu:inventory:warehouse', title: '仓库列表', type: 'menu' },
      { key: 'menu:inventory:current-stock', title: '当前库存', type: 'menu' },
      { key: 'menu:inventory:stock-transactions', title: '库存流水', type: 'menu' },
      {
        key: 'menu:inventory:stock-alert',
        title: '安全库存预警',
        type: 'menu',
        children: [{ key: 'inventory:stock-alert:create-request', title: '创建采购申请', type: 'button' }],
      },
    ],
  },
  {
    key: 'group:product',
    title: '商品管理',
    type: 'menu',
    children: [
      { key: 'menu:product:category', title: '商品分类', type: 'menu' },
      { key: 'menu:product:list', title: '商品列表', type: 'menu' },
    ],
  },
  {
    key: 'group:purchase',
    title: '采购管理',
    type: 'menu',
    children: [
      {
        key: 'menu:purchase:request',
        title: '采购申请',
        type: 'menu',
        children: [
          { key: 'purchase:request:create', title: '新建', type: 'button' },
          { key: 'purchase:request:update', title: '编辑', type: 'button' },
          { key: 'purchase:request:submit', title: '提交', type: 'button' },
          { key: 'purchase:request:generate-order', title: '生成订单', type: 'button' },
        ],
      },
      {
        key: 'menu:purchase:order',
        title: '采购订单',
        type: 'menu',
        children: [
          { key: 'purchase:order:update', title: '编辑', type: 'button' },
          { key: 'purchase:order:send', title: '发送供应商', type: 'button' },
        ],
      },
    ],
  },
  {
    key: 'group:supplier-portal',
    title: '供应商端',
    type: 'menu',
    children: [
      { key: 'menu:supplier-portal:home', title: '首页', type: 'menu' },
      { key: 'menu:supplier-portal:my-orders', title: '我的采购订单', type: 'menu' },
      { key: 'menu:supplier-portal:to-ship', title: '待发货', type: 'menu' },
      { key: 'menu:supplier-portal:shipments', title: '发货记录', type: 'menu' },
    ],
  },
  {
    key: 'group:approval',
    title: '审批中心',
    type: 'menu',
    children: [
      {
        key: 'menu:approval:pending',
        title: '我的审批',
        type: 'menu',
        children: [
          { key: 'approval:pending:approve', title: '通过', type: 'button' },
          { key: 'approval:pending:reject', title: '拒绝', type: 'button' },
        ],
      },
      { key: 'menu:approval:processed', title: '我已审批', type: 'menu' },
    ],
  },
  {
    key: 'group:reconciliation',
    title: '对账管理',
    type: 'menu',
    children: [
      { key: 'menu:reconciliation:list', title: '对账列表', type: 'menu' },
      { key: 'menu:reconciliation:pending-pool', title: '待对账单据池', type: 'menu' },
      { key: 'menu:reconciliation:overview', title: '对账汇总看板', type: 'menu' },
    ],
  },
  {
    key: 'group:supplier',
    title: '供应商管理',
    type: 'menu',
    children: [{ key: 'menu:supplier:list', title: '供应商列表', type: 'menu' }],
  },
  {
    key: 'group:payment',
    title: '付款管理',
    type: 'menu',
    children: [
      { key: 'menu:payment:pending', title: '待付款订单', type: 'menu' },
      { key: 'menu:payment:records', title: '付款记录', type: 'menu' },
    ],
  },
  {
    key: 'group:report',
    title: '报表中心',
    type: 'menu',
    children: [
      { key: 'menu:report:dashboard', title: '报表首页', type: 'menu' },
      { key: 'menu:report:purchase-summary', title: '采购汇总报表', type: 'menu' },
      { key: 'menu:report:purchase-detail', title: '采购明细报表', type: 'menu' },
      { key: 'menu:report:supplier-analysis', title: '供应商采购分析', type: 'menu' },
      { key: 'menu:report:inventory-summary', title: '库存汇总报表', type: 'menu' },
      { key: 'menu:report:stock-transactions', title: '库存流水报表', type: 'menu' },
      { key: 'menu:report:stock-alert', title: '安全库存预警报表', type: 'menu' },
      { key: 'menu:report:payable', title: '付款 / 应付报表', type: 'menu' },
    ],
  },
  {
    key: 'group:receiving',
    title: '收货与验收',
    type: 'menu',
    children: [
      { key: 'menu:receiving:receipt', title: '收货单（只读）', type: 'menu' },
      { key: 'menu:receiving:inspection', title: '验收单（只读）', type: 'menu' },
    ],
  },
  {
    key: 'group:system',
    title: '系统管理',
    type: 'menu',
    children: [
      {
        key: 'menu:system:user',
        title: '用户管理',
        type: 'menu',
        children: [
          { key: 'system:user:create', title: '新建用户', type: 'button' },
          { key: 'system:user:update', title: '编辑用户', type: 'button' },
          { key: 'system:user:reset-password', title: '重置密码', type: 'button' },
          { key: 'system:user:toggle-status', title: '停用 / 启用', type: 'button' },
        ],
      },
      {
        key: 'menu:system:role',
        title: '角色管理',
        type: 'menu',
        children: [
          { key: 'system:role:create', title: '新建角色', type: 'button' },
          { key: 'system:role:update', title: '编辑角色', type: 'button' },
          { key: 'system:role:toggle-status', title: '停用 / 启用', type: 'button' },
          { key: 'system:role:config', title: '配置权限', type: 'button' },
        ],
      },
      {
        key: 'menu:system:operation-log',
        title: '操作日志（只读）',
        type: 'menu',
        children: [{ key: 'system:log:export', title: '导出 Excel', type: 'button' }],
      },
    ],
  },
]
