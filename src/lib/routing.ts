import { findKeywordPageByPath } from '../content/keyword-pages'

export function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized || '/'
}

export type RouteView = 'home' | 'keyword' | 'privacy' | 'terms' | 'checkout-done' | 'not-found'

export function deriveRouteView(pathname: string): RouteView {
  const normalized = normalizePathname(pathname)

  if (normalized === '/') return 'home'
  if (normalized === '/privacy') return 'privacy'
  if (normalized === '/terms') return 'terms'
  if (normalized === '/checkout/done') return 'checkout-done'
  if (findKeywordPageByPath(normalized)) return 'keyword'

  return 'not-found'
}

export function scrollToHashTarget(hash: string, behavior: ScrollBehavior = 'smooth') {
  if (!hash) return
  const target = document.querySelector(hash)
  if (target instanceof HTMLElement) {
    target.scrollIntoView({ behavior, block: 'start' })
  }
}
