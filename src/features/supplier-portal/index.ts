/**
 * 供应商门户（supplier-portal）领域的统一出口。
 * 页面通过此 barrel 引用类型 / 服务 / Hooks，避免深层路径耦合内部文件布局。
 */
export * from './types'
export { portalService } from './services/portalService'
export {
  portalQueryKeys,
  usePortalOrders,
  usePortalOrderDetail,
  usePortalShipments,
  usePortalSummary,
} from './hooks/usePortalQueries'
export { usePortalMutations } from './hooks/usePortalMutations'
export { PortalOrderFilterBar, type PortalOrderFilters } from './components/PortalOrderFilterBar'
export { PortalOrderItemsTable } from './components/PortalOrderItemsTable'
export { PortalOrderTable } from './components/PortalOrderTable'
export { PortalOrderDetailView } from './components/PortalOrderDetailView'
export { ConfirmOrderModal } from './components/ConfirmOrderModal'
export { RejectOrderModal } from './components/RejectOrderModal'
export { ShipFormView } from './components/ShipFormView'
