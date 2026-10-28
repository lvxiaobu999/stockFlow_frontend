import dayjs from 'dayjs'
import type { ApprovalRecord, ApprovalAction } from '@/features/approval/types'
import type { PurchaseRequestRecord, PurchaseRequestStatus } from '@/features/purchase/types'
import { calcItemAmount, calcTotalAmount } from '@/features/purchase/utils/purchaseRequest'
import { productsMock } from './products'
import { findUserByUsername } from './users'

/**
 * 采购申请 Mock 数据：12 条申请覆盖全部状态（草稿 2 / 待审批 4 / 已通过 2 /
 * 已拒绝 2 / 已生成订单 2），编号 PR + 日期 + 4 位流水按创建日期递增。
 *
 * - 明细引用 productsMock 真实商品（价格取采购参考价），保证与商品数据集自洽；
 * - 审批流水（approvalRecordsMock）由各申请的生命周期确定性生成，
 *   审批中心模块落地后迁移归口（当前「通过 / 拒绝」结论均为演示数据）；
 * - 「已生成订单」记录的 orderedOrderId / orderedOrderCode 与采购订单数据集
 *   （mocks/data/purchaseOrders.ts）互为镜像：订单由申请种子派生，
 *   订单 id 按 ordered 申请顺序 po-001 递增（两侧推导规则必须一致）。
 */

/** 明细种子：prodIndex 对应 productsMock 下标，数量为采购需求量。 */
interface ItemSeed {
  prodIndex: number
  quantity: number
  remark?: string
}

/** 申请种子：step 描述生命周期（决定状态与审批流水）。 */
interface RequestSeed {
  title: string
  /** 申请人登录名（mock 用户表查找，部门随档案快照）。 */
  applicant: string
  expectedDate?: string
  reason: string
  items: ItemSeed[]
  status: PurchaseRequestStatus
  /** 生命周期动作（按时间顺序）；create 外的动作自动生成对应审批流水。 */
  steps: ApprovalAction[]
  /** 审批意见（reject 时必填，approve 可选）。 */
  comment?: string
  /** 已生成订单的订单编码（仅 ordered）。 */
  orderedOrderCode?: string
}

const requestSeeds: RequestSeed[] = [
  {
    title: '打印机耗材补货（安全库存预警）',
    applicant: 'zhangwei',
    expectedDate: '2026-09-28',
    reason: '总仓硒鼓与粉盒库存低于安全库存，触发预警补货',
    items: [
      { prodIndex: 10, quantity: 40, remark: '兼容硒鼓先顶量' },
      { prodIndex: 12, quantity: 20 },
    ],
    status: 'ordered',
    steps: ['create', 'submit', 'approve'],
    orderedOrderCode: 'PO202609060001',
  },
  {
    title: '新员工笔记本电脑采购（市场部 3 人）',
    applicant: 'linmin',
    expectedDate: '2026-09-30',
    reason: '市场部新入职 3 人，需配办公电脑',
    items: [{ prodIndex: 16, quantity: 3, remark: '含原装包与鼠标' }],
    status: 'ordered',
    steps: ['create', 'submit', 'approve'],
    orderedOrderCode: 'PO202609070002',
  },
  {
    title: '仓储清洁用品月度补充',
    applicant: 'zhaolei',
    expectedDate: '2026-10-10',
    reason: '仓库清洁用品月度例行补充',
    items: [
      { prodIndex: 22, quantity: 30 },
      { prodIndex: 23, quantity: 40, remark: '擦手纸按箱' },
      { prodIndex: 24, quantity: 12 },
    ],
    status: 'approved',
    steps: ['create', 'submit', 'approve'],
  },
  {
    title: '会议室扩展坞与转接头采购',
    applicant: 'zhangwei',
    expectedDate: '2026-10-15',
    reason: '三楼大会议室设备升级，笔记本外接投影需要',
    items: [
      { prodIndex: 18, quantity: 2, remark: '外接投影对接' },
      { prodIndex: 19, quantity: 2 },
    ],
    status: 'approved',
    steps: ['create', 'submit', 'approve'],
  },
  {
    title: '办公家具批量采购（新办公区）',
    applicant: 'linmin',
    expectedDate: '2026-10-20',
    reason: '新办公区工位与文件柜配置',
    items: [
      { prodIndex: 28, quantity: 20 },
      { prodIndex: 29, quantity: 6 },
    ],
    status: 'rejected',
    steps: ['create', 'submit', 'reject'],
    comment: '本季度家具预算超支，请压缩数量或分期后再提',
  },
  {
    title: '员工培训文具套装采购',
    applicant: 'zhangwei',
    expectedDate: '2026-09-25',
    reason: '新员工培训约 60 人，按人手一套配置笔类文具',
    items: [
      { prodIndex: 8, quantity: 60 },
      { prodIndex: 9, quantity: 60, remark: '与铅笔配成套' },
    ],
    status: 'rejected',
    steps: ['create', 'submit', 'reject'],
    comment: '供应商与比价未定，暂缓，先走比价流程',
  },
  {
    title: '仓库文件柜更换申请',
    applicant: 'liuyang',
    expectedDate: '2026-10-08',
    reason: '二号库单据文件柜老化损坏，维修不划算',
    items: [{ prodIndex: 29, quantity: 2 }],
    status: 'pending',
    steps: ['create', 'submit'],
  },
  {
    title: '打印纸月度集中采购',
    applicant: 'zhangwei',
    expectedDate: '2026-10-12',
    reason: '各部门打印纸库存月度集中补货，集中采购价更优',
    items: [
      { prodIndex: 0, quantity: 60 },
      { prodIndex: 1, quantity: 40 },
      { prodIndex: 2, quantity: 30, remark: 'A3 供需方送贷' },
    ],
    status: 'pending',
    steps: ['create', 'submit'],
  },
  {
    title: '键鼠套装更换（客服组）',
    applicant: 'linmin',
    expectedDate: '2026-10-18',
    reason: '客服组 15 套键鼠老化，故障率高',
    items: [{ prodIndex: 20, quantity: 15, remark: '静音款优先' }],
    status: 'pending',
    steps: ['create', 'submit'],
  },
  {
    title: '扩展坞与转接头备货',
    applicant: 'zhaolei',
    expectedDate: '2026-10-25',
    reason: '新采购笔记本接口不兼容，需备转接配件',
    items: [
      { prodIndex: 18, quantity: 10 },
      { prodIndex: 19, quantity: 10 },
    ],
    status: 'draft',
    steps: ['create'],
  },
  {
    title: '中性笔与圆珠笔补充',
    applicant: 'zhangwei',
    reason: '行政常备笔类库存不足，先行登记',
    items: [
      { prodIndex: 6, quantity: 100 },
      { prodIndex: 7, quantity: 80 },
    ],
    status: 'draft',
    steps: ['create', 'submit', 'withdraw'],
  },
  {
    title: '消毒液与百洁布补充',
    applicant: 'linmin',
    expectedDate: '2026-10-06',
    reason: '茶水间与保洁用量补充',
    items: [
      { prodIndex: 24, quantity: 10 },
      { prodIndex: 25, quantity: 50 },
    ],
    status: 'pending',
    steps: ['create', 'submit'],
  },
]

/** 审批流水时间推进量（小时）：create 当点，submit +2h，结论 +22h，保证时序确定。 */
const STEP_OFFSET_HOURS: Record<ApprovalAction, number> = {
  create: 0,
  submit: 2,
  resubmit: 26,
  withdraw: 26,
  approve: 22,
  reject: 22,
}

/** 审批结论的动作归属人：结论由审批人出具，其余动作归申请人本人。 */
const CONCLUSION_ACTIONS: ApprovalAction[] = ['approve', 'reject']
/** 轮换演示审批人：与需求「先到先审」一致，这里按序分配保证演示稳定；
 * admin 首位，保证演示管理员登录后在「我已审批」有真实数据可看。 */
const DEMO_APPROVERS = ['admin', 'wangfang', 'qianfeng', 'zhouyu']

export const purchaseRequestsMock: PurchaseRequestRecord[] = requestSeeds
  .map((seed, index) => {
    const applicant = findUserByUsername(seed.applicant)
    if (!applicant) throw new Error(`采购申请种子引用了不存在的用户：${seed.applicant}`)

    // 「已生成订单」的订单 id 投影：按 ordered 申请顺序递增（与订单数据集派生规则一致）。
    const orderedSeq = requestSeeds.slice(0, index + 1).filter((item) => item.status === 'ordered').length

    // 创建日期按序号递增（09-05 起），编号 = PR + 创建日期 + 4 位流水。
    const createdAt = dayjs('2026-09-04 10:00:00')
      .add(index + 1, 'day')
      .format('YYYY-MM-DD HH:mm:ss')
    const code = `PR${dayjs(createdAt).format('YYYYMMDD')}${String(index + 1).padStart(4, '0')}`

    const items = seed.items.map((itemSeed, itemIndex) => {
      const product = productsMock[itemSeed.prodIndex]
      if (!product) throw new Error(`采购申请种子引用了不存在的商品下标：${itemSeed.prodIndex}`)
      return {
        id: `${code}-item-${itemIndex + 1}`,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        spec: product.spec,
        unit: product.unit,
        quantity: itemSeed.quantity,
        // 参考价默认取商品采购参考价（申请人可调，种子统一取默认值便于口径校验）。
        referencePrice: product.purchasePrice,
        amount: calcItemAmount(itemSeed.quantity, product.purchasePrice),
        remark: itemSeed.remark,
      }
    })

    // 提交时间取创建 +2h；撤回后回到草稿态，提交时间清空（与 handler 口径一致）。
    const hasSubmitted = seed.steps.includes('submit')
    const withdrawn = seed.steps.includes('withdraw')
    const submittedAt = hasSubmitted
      ? dayjs(createdAt).add(STEP_OFFSET_HOURS.submit, 'hour').format('YYYY-MM-DD HH:mm:ss')
      : undefined

    return {
      id: `pr-${String(index + 1).padStart(3, '0')}`,
      code,
      title: seed.title,
      applicantId: applicant.id,
      applicantName: applicant.name,
      department: applicant.department ?? '',
      expectedDate: seed.expectedDate,
      reason: seed.reason,
      totalAmount: calcTotalAmount(items),
      status: seed.status,
      items,
      submittedAt: withdrawn ? undefined : submittedAt,
      orderedOrderId: seed.orderedOrderCode ? `po-${String(orderedSeq).padStart(3, '0')}` : undefined,
      orderedOrderCode: seed.orderedOrderCode,
      createdAt,
      updatedAt: submittedAt ?? createdAt,
    }
  })
  // 列表默认按创建时间倒序（与分页「最新在前」口径一致）。
  .reverse()

/** 全量审批流水：按各申请的生命周期种子确定性展开，审批中心落地后迁走。 */
export const approvalRecordsMock: ApprovalRecord[] = (() => {
  // 结论审批人序号放在 flatMap 外层：轮换按「全局结论次数」推进，
  // 若放在单条申请内每条都会从第一位审批人重新开始，失去轮换意义。
  let approverSeq = 0
  return requestSeeds.flatMap((seed, index) => {
    const applicant = findUserByUsername(seed.applicant)
    if (!applicant) throw new Error(`采购申请种子引用了不存在的用户：${seed.applicant}`)
    const businessId = `pr-${String(index + 1).padStart(3, '0')}`
    const createdAt = dayjs('2026-09-04 10:00:00').add(index + 1, 'day')

    return seed.steps.map((action, stepIndex) => {
      // 结论动作归属审批人（按序轮换），其余动作归申请人。
      const isConclusion = CONCLUSION_ACTIONS.includes(action)
      const operator = isConclusion
        ? (findUserByUsername(DEMO_APPROVERS[approverSeq++ % DEMO_APPROVERS.length]) ?? applicant)
        : applicant
      return {
        id: `${businessId}-apr-${stepIndex + 1}`,
        businessType: 'purchase_request',
        businessId,
        action,
        operatorId: operator.id,
        operatorName: operator.name,
        department: operator.department,
        comment: isConclusion ? seed.comment : undefined,
        createdAt: createdAt.add(STEP_OFFSET_HOURS[action], 'hour').format('YYYY-MM-DD HH:mm:ss'),
      }
    })
  })
})()

/** 生成下一个申请编号：全局最大流水 + 1，日期段为当天（服务端生成口径）。 */
export function nextPurchaseRequestCode(): string {
  const maxSeq = purchaseRequestsMock.reduce((max, item) => Math.max(max, Number(item.code.slice(-4))), 0)
  return `PR${dayjs().format('YYYYMMDD')}${String(maxSeq + 1).padStart(4, '0')}`
}
