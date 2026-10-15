import { appEnv } from '@/config/env'

/**
 * 登录页左侧品牌区：铺满品牌色渐变背景，向用户传达系统定位。
 * 中屏以下（≤992px）整块隐藏，只保留右侧登录卡，样式见 App.less 登录页分区。
 */
export function LoginBrandPanel() {
  return (
    <div className="login-brand">
      <div className="login-brand-badge">进销存管理系统</div>
      <h1 className="login-brand-title">{appEnv.appName} 一体化进销存管理平台</h1>
      <p className="login-brand-desc">
        打通「采购申请 → 审批 → 采购订单 → 收货 → 验收 → 入库 → 对账 → 付款」全链路， 单据驱动、状态流转、账实一致。
      </p>
      <ul className="login-brand-points">
        <li>单据全流程追踪，审批与到货进度一目了然</li>
        <li>库存流水只增不改，盘点对账有据可查</li>
        <li>供应商门户协同，发货与对账实时同步</li>
      </ul>
    </div>
  )
}
