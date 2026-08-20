import { useSyncExternalStore } from 'react'

export type Route = 'home' | 'app' | 'pricing' | 'admin'

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

function getSnapshot() {
  return window.location.hash
}

function viewParam(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('view')
}

/** Path inside the hash (`#/app?auth=1` → `app`). Auth-token hashes are not routes. */
export function hashPath(hash = typeof window === 'undefined' ? '' : window.location.hash): string {
  const raw = hash.replace(/^#/, '')
  if (!raw.startsWith('/')) return ''
  return raw.replace(/^\//, '').split('?')[0] || ''
}

/** True when the app is embedded via `[yue_translator]` (`?view=app`). */
export function isEmbeddedAppView(): boolean {
  return viewParam() === 'app'
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => '')
  const path = hashPath(hash)
  // Hash wins after the user navigates inside an embed (e.g. splash → #/app).
  if (path === 'app') return 'app'
  if (path === 'pricing') return 'pricing'
  if (path === 'admin') return 'admin'
  if (isEmbeddedAppView()) return 'app'
  if (viewParam() === 'pricing') return 'pricing'
  return 'home'
}

export function navigate(route: Route) {
  if (route === 'app') {
    window.location.hash = '/app'
  } else if (route === 'pricing') {
    window.location.hash = '/pricing'
  } else if (route === 'admin') {
    window.location.hash = '/admin'
  } else {
    window.location.hash = '/'
  }
  window.scrollTo({ top: 0 })
}
