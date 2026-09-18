import { Layout } from 'antd'
import { createRef, useMemo } from 'react'
import { SwitchTransition, CSSTransition } from 'react-transition-group'
import { useLocation, useOutlet } from 'react-router-dom'
import { AppHeader } from '@/layouts/components/AppHeader'
import { AppSidebar } from '@/layouts/components/AppSidebar'

// react-transition-group 需要在渲染阶段使用 ref 对象来协调进入和离开节点。
/* oxlint-disable react/refs */

const { Content } = Layout

/** 应用壳层只负责组合布局区域，业务逻辑放在对应 feature 中。 */
export default function AppLayout() {
  const location = useLocation()
  const outlet = useOutlet()
  // 用完整地址（含查询与 hash）作为切换 key，路径变化时触发一次过渡动画。
  const transitionKey = `${location.pathname}${location.search}${location.hash}`
  // key 变化时重建 ref 对象，供 CSSTransition 协调新旧节点的进入与离开。
  const transitionNode = useMemo(() => ({ key: transitionKey, ref: createRef<HTMLDivElement>() }), [transitionKey])

  return (
    <Layout className="app-shell">
      <AppSidebar />
      <Layout className="app-main-layout">
        <AppHeader />
        <Content className="app-content">
          <div className="route-transition-viewport">
            {/* out-in：旧页面先淡出再挂载新页面，避免两者同时存在造成布局跳动。 */}
            <SwitchTransition mode="out-in">
              <CSSTransition
                key={transitionNode.key}
                nodeRef={transitionNode.ref}
                timeout={220}
                classNames="route-fade"
                unmountOnExit
              >
                <div ref={transitionNode.ref} className="route-transition">
                  {outlet}
                </div>
              </CSSTransition>
            </SwitchTransition>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
