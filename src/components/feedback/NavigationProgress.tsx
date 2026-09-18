import NProgress from 'nprogress'
import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import './NavigationProgress.css'

/**
 * 进度条兜底结束时间。正常情况下地址更新后会自动 finish，
 * 但当路由组件渲染抛错或跳转未触发地址变化时，靠这个定时器强制结束，
 * 避免进度条一直卡在顶部。
 */
export const NAVIGATION_PROGRESS_FALLBACK_MS = 10_000

/** 判断是否是一次「带修饰键」的点击，这类点击浏览器会走默认行为而非 SPA 跳转。 */
function isModifiedClick(event: MouseEvent): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

/** 判断锚点是否指向当前应用内的路由，而不是外链、锚点或特殊协议。 */
function isInternalNavigation(anchor: HTMLAnchorElement): boolean {
  // 新窗口打开或下载链接交给浏览器处理，不需要进度条。
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false
  const href = anchor.getAttribute('href')
  // 空链接、页内锚点、邮件和电话链接都不属于 SPA 路由跳转。
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false

  // 解析出绝对地址后比较 origin，跨域链接直接放行给浏览器。
  const url = new URL(anchor.href, window.location.href)
  return url.origin === window.location.origin
}

/** 在内部链接或 history 跳转前启动，地址更新后结束，并在路由异常时自动兜底结束。 */
export function NavigationProgress() {
  const location = useLocation()
  // 是否正在显示进度条；用 ref 而非 state，避免每次切换触发重渲染。
  const pendingRef = useRef(false)
  // 兜底定时器句柄，start 时设置、finish 时清除。
  const fallbackTimerRef = useRef<number | undefined>(undefined)

  /**
   * 结束进度条。幂等：重复调用不会出错。
   *
   * @param force 传 true 时强制触发 NProgress 的结束动画，常用于卸载或兜底场景；
   *              默认为 false，由 NProgress 自行判断是否补完进度再消失。
   */
  const finish = useCallback((force = false) => {
    // 只要结束就清掉兜底定时器，避免它稍后又触发一次 finish。
    if (fallbackTimerRef.current !== undefined) {
      window.clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = undefined
    }
    // 没有进行中的进度时直接返回，防止异常路径下的多余调用。
    if (!pendingRef.current) return
    pendingRef.current = false
    NProgress.done(force)
  }, [])

  /** 启动进度条，并设置兜底定时器防止路由异常导致进度条永久卡住。 */
  const start = useCallback(() => {
    // 快速连续跳转时先清掉上一个兜底定时器，再基于最新的跳转重新计时。
    if (fallbackTimerRef.current !== undefined) window.clearTimeout(fallbackTimerRef.current)
    pendingRef.current = true
    NProgress.start()
    fallbackTimerRef.current = window.setTimeout(() => finish(true), NAVIGATION_PROGRESS_FALLBACK_MS)
  }, [finish])

  // 组件挂载时配置进度条外观，卸载时强制结束并移除全局 DOM 节点。
  useEffect(() => {
    NProgress.configure({ showSpinner: false, minimum: 0.15, trickleSpeed: 180 })
    return () => {
      finish(true)
      NProgress.remove()
    }
  }, [finish])

  /**
   * 监听三类内部导航入口，在跳转发生前启动进度条：
   * 1. 点击内部 <a> 链接（捕获阶段，避免被业务代码阻止冒泡而漏掉）；
   * 2. 浏览器前进/后退（popstate）；
   * 3. 代码调用 history.pushState/replaceState（React Router 内部会用到）。
   * 卸载时还原所有监听与原生方法，避免污染后续页面。
   */
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // 已被阻止默认行为、带修饰键、或点击目标不是元素的场景都不处理。
      if (event.defaultPrevented || isModifiedClick(event) || !(event.target instanceof Element)) return
      const anchor = event.target.closest('a')
      if (anchor instanceof HTMLAnchorElement && isInternalNavigation(anchor)) {
        const nextUrl = new URL(anchor.href, window.location.href)
        const currentUrl = new URL(window.location.href)
        // 只有地址真正变化才启动，避免点击「当前页」的链接产生无意义的进度。
        if (nextUrl.href !== currentUrl.href) start()
      }
    }

    const handlePopState = () => start()
    // 备份原生方法，卸载时还原，防止多次挂载叠加导致重复触发。
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState
    window.history.pushState = function pushState(...args) {
      start()
      originalPushState.apply(window.history, args)
    }
    window.history.replaceState = function replaceState(...args) {
      start()
      originalReplaceState.apply(window.history, args)
    }
    document.addEventListener('click', handleClick, true)
    window.addEventListener('popstate', handlePopState)

    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('popstate', handlePopState)
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      finish(true)
    }
  }, [finish, start])

  // 地址更新后稍等 140ms 再结束，给新页面一个渲染的瞬间，让进度条自然收尾。
  useEffect(() => {
    if (!pendingRef.current) return
    const timer = window.setTimeout(() => finish(), 140)

    return () => window.clearTimeout(timer)
  }, [finish, location.hash, location.pathname, location.search])

  // 纯副作用组件，不渲染任何内容。
  return null
}
