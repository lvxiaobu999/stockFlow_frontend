import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 库存流水报表页面（占位）：后续业务逻辑放在 features/report。 */
export default function StockTransactionsReportPage() {
  return <PlaceholderPage {...routeMeta.reportStockTransactions} />
}
