import { useSyncExternalStore } from 'react'

export type Route = 'home' | 'app'

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

function getSnapshot() {
  return window.location.hash
}

/** True when the app is embedded (WordPress shortcode passes ?view=app). */
export function isEmbeddedAppView(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('view') === 'app'
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => '')
  const normalized = hash.replace(/^#\/?/, '')
  if (normalized === 'app' || isEmbeddedAppView()) return 'app'
  return 'home'
}

export function navigate(route: Route) {
  window.location.hash = route === 'app' ? '/app' : '/'
}
