# 接口与 Mock 说明

## Axios 调用约定

不要在页面或展示组件中直接导入 Axios。统一通过 `src/services/httpClient.ts` 导出的 `apiClient`：

```ts
import { apiClient } from '@/services/httpClient'
import type { Product } from '@/features/products/types'

export async function getProducts() {
  const response = await apiClient.get<Product[]>('/products')
  return response.data
}
```

实例已统一配置 `baseURL`、`withCredentials`、JSON 请求头和错误归一化。需要取消请求时，将 TanStack Query 提供的 `signal` 传给 Axios 的 `signal` 配置。

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
