import { useState } from 'react'
import { Alert, App, Button, Card, Space, Spin } from 'antd'
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { routeMeta } from '@/config/routes'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/features/auth/hooks/usePermissions'
import { ProductDetailView } from '@/features/product/components/product/ProductDetailView'
import { ProductFilterBar, type ProductFilters } from '@/features/product/components/product/ProductFilterBar'
import { ProductFormView } from '@/features/product/components/product/ProductFormView'
import { ProductTable } from '@/features/product/components/product/ProductTable'
import { useCategories } from '@/features/product/hooks/useCategories'
import { useProductMutations } from '@/features/product/hooks/useProductMutations'
import { useProducts } from '@/features/product/hooks/useProducts'
import type { ProductRecord } from '@/features/product/types'
import { downloadCsv } from '@/utils'

/** 页内视图态：列表 / 新建 / 编辑 / 详情（编辑或刷新列表时切回列表，文档记录的限制）。 */
type ProductView = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; id: string } | { mode: 'detail'; id: string }

/**
 * 商品列表页：列表 / 表单 / 详情三态页内切换。
 *
 * 列表数据走 React Query 缓存，从表单或详情返回时缓存命中、不重新请求；
 * 表单与详情视图按 id 独立查询，互不影响列表缓存。
 */
export default function ProductListPage() {
  const { message } = App.useApp()
  const { has } = usePermissions()
  const [view, setView] = useState<ProductView>({ mode: 'list' })
  const [filters, setFilters] = useState<ProductFilters>({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })

  // 分类树与商品列表常驻查询：表单的分类下拉与列表的分类列共用。
  const { records: categories, pathMap } = useCategories()
  const { data, isLoading, isFetching, error, refetch } = useProducts({
    ...filters,
    ...pagination,
  })
  const { toggleStatus } = useProductMutations()
  // 编辑视图需要完整记录（列表行字段已足够，直接复用列表数据源，避免二次请求）。
  const editingRecord = view.mode === 'edit' ? (data?.lists.find((item) => item.id === view.id) ?? null) : null

  const categoryPathOf = (id: string) => pathMap.get(id) ?? '—'

  /** 导出当前页 CSV（MVP 口径：只导出当前筛选 + 当前页数据）。 */
  const handleExport = () => {
    if (!data || data.lists.length === 0) {
      message.warning('当前页没有可导出的数据')
      return
    }
    const header = [
      '商品编码',
      '商品名称',
      '规格型号',
      '分类',
      '单位',
      '采购参考价',
      '销售参考价',
      '安全库存',
      '当前库存',
      '状态',
    ]
    const rows = data.lists.map((item) => [
      item.code,
      item.name,
      item.spec,
      categoryPathOf(item.categoryId),
      item.unit,
      item.purchasePrice,
      item.salePrice ?? '',
      item.safetyStock,
      item.totalStock,
      item.status === 1 ? '启用' : '停用',
    ])
    downloadCsv(`商品列表_${dayjs().format('YYYYMMDD_HHmm')}.csv`, header, rows)
    message.success('已导出当前页数据')
  }

  // 筛选条件变化时回到第一页，避免停留在已不存在的页码上。
  const handleSearch = (next: ProductFilters) => {
    setFilters(next)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  /** 停用 / 启用商品。 */
  const handleToggleStatus = (record: ProductRecord) => {
    const nextStatus = record.status === 1 ? 0 : 1
    toggleStatus.mutate(
      { id: record.id, status: nextStatus },
      {
        onSuccess: () => message.success(`商品 ${record.name} 已${nextStatus === 1 ? '启用' : '停用'}`),
        onError: (error) => message.error(error.message),
      },
    )
  }

  // ── 表单 / 详情视图 ────────────────────────────────────────────────
  if (view.mode === 'create') {
    return (
      <ProductFormView
        key="create"
        product={null}
        categories={categories}
        onCancel={() => setView({ mode: 'list' })}
        onSaved={() => setView({ mode: 'list' })}
      />
    )
  }
  if (view.mode === 'edit') {
    if (!editingRecord) {
      // 列表缓存被清（如刚失效刷新）时行数据暂缺，先回列表兜底。
      return (
        <ProductFormView
          key="edit-missing"
          product={null}
          categories={categories}
          onCancel={() => setView({ mode: 'list' })}
          onSaved={() => setView({ mode: 'list' })}
        />
      )
    }
    return (
      <ProductFormView
        key={view.id}
        product={editingRecord}
        categories={categories}
        onCancel={() => setView({ mode: 'list' })}
        onSaved={() => setView({ mode: 'list' })}
      />
    )
  }
  if (view.mode === 'detail') {
    return (
      <ProductDetailView
        id={view.id}
        categoryPathOf={categoryPathOf}
        onBack={() => setView({ mode: 'list' })}
        onEdit={() => setView({ mode: 'edit', id: view.id })}
      />
    )
  }

  // ── 列表视图 ───────────────────────────────────────────────────────
  return (
    <div className="dashboard-page">
      <PageHeader
        title={routeMeta.productList.title}
        description={routeMeta.productList.description}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
              刷新
            </Button>
            {has('product:list:export') ? (
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
            ) : null}
            {has('product:list:create') ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setView({ mode: 'create' })}>
                新建商品
              </Button>
            ) : null}
          </Space>
        }
      />
      {error ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message="商品列表加载失败"
          description={error.message}
          action={
            <Button size="small" danger onClick={() => void refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <ProductFilterBar categories={categories} onSearch={handleSearch} />
      <Card size="small" className="mt-4">
        {isLoading && !data ? (
          <div className="route-fallback" role="status" aria-label="商品列表加载中">
            <Spin size="large" />
          </div>
        ) : (
          <ProductTable
            data={data}
            loading={isLoading}
            fetching={isFetching}
            categoryPathOf={categoryPathOf}
            onPageChange={(current, pageSize) => setPagination({ current, pageSize })}
            onView={(record) => setView({ mode: 'detail', id: record.id })}
            onEdit={(record) => setView({ mode: 'edit', id: record.id })}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </Card>
    </div>
  )
}
