import { routeMeta } from '@/config/routes'
import PlaceholderPage from '@/pages/PlaceholderPage'

/** 商品分类页面（占位）：后续业务逻辑放在 features/product。 */
export default function CategoryPage() {
  return <PlaceholderPage {...routeMeta.productCategory} />
}
