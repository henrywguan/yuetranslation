import { useSyncExternalStore } from 'react'

export type Route = 'home' | 'app' | 'pricing'

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

/** True when the app is embedded via `[yue_translator]` (`?view=app`). */
export function isEmbeddedAppView(): boolean {
  return viewParam() === 'app'
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => '')
  const normalized = hash.replace(/^#\/?/, '')
  // Hash wins after the user navigates inside an embed (e.g. splash → #/app).
  if (normalized === 'app') return 'app'
  if (normalized === 'pricing') return 'pricing'
  if (isEmbeddedAppView()) return 'app'
  if (viewParam() === 'pricing') return 'pricing'
  return 'home'
}

export function navigate(route: Route) {
  if (route === 'app') {
    window.location.hash = '/app'
  } else if (route === 'pricing') {
    window.location.hash = '/pricing'
  } else {
    window.location.hash = '/'
  }
  window.scrollTo({ top: 0 })
}
