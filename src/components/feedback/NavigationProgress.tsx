import NProgress from 'nprogress'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import './NavigationProgress.css'

function isModifiedClick(event: MouseEvent): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

function isInternalNavigation(anchor: HTMLAnchorElement): boolean {
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false

  const url = new URL(anchor.href, window.location.href)
  return url.origin === window.location.origin
}

/** 在内部链接或 history 跳转前启动，React Router 更新地址后自动结束。 */
export function NavigationProgress() {
  const location = useLocation()
  const pendingRef = useRef(false)

  useEffect(() => {
    NProgress.configure({ showSpinner: false, minimum: 0.15, trickleSpeed: 180 })
    return () => {
      NProgress.remove()
    }
  }, [])

  useEffect(() => {
    const start = () => {
      pendingRef.current = true
      NProgress.start()
    }

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event) || !(event.target instanceof Element)) return
      const anchor = event.target.closest('a')
      if (anchor instanceof HTMLAnchorElement && isInternalNavigation(anchor)) {
        const nextUrl = new URL(anchor.href, window.location.href)
        const currentUrl = new URL(window.location.href)
        if (nextUrl.href !== currentUrl.href) start()
      }
    }

    const handlePopState = () => start()
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
    }
  }, [])

  useEffect(() => {
    if (!pendingRef.current) return
    const timer = window.setTimeout(() => {
      NProgress.done()
      pendingRef.current = false
    }, 140)

    return () => window.clearTimeout(timer)
  }, [location.pathname, location.search, location.hash])

  return null
}
