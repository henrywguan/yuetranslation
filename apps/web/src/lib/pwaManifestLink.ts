/**
 * Point `<link rel="manifest">` at the translator or chat PWA manifest.
 * Distinct `id` + `start_url` let Chromium install two Home Screen / desktop icons.
 *
 * Everyday chat URL is hash-only: `/#/chat` (never `/chat#/chat` in the address bar).
 * Chromium chat PWA still uses manifest `start_url: /chat` (index.html maps → `#/chat`).
 *
 * iOS Add to Home Screen bookmarks the document URL and often strips the hash.
 * Opening A2HS from bare `/#/chat` would collapse to `/` → standalone `#/app`.
 * While the chat iOS install tip is visible we briefly latch pathname `/chat` so
 * the bookmark survives; after dismiss we restore `/#/chat`.
 */
import { clearDeferredInstallPrompt } from './pwaInstallPrompt'

export type PwaManifestVariant = 'app' | 'chat'

const MANIFEST_LINK_ATTR = 'data-yue-pwa-variant'
const APPLE_TITLE_APP = 'JyutTranslate'
const APPLE_TITLE_CHAT = 'DeepSeek Chat'

export function pwaManifestHref(variant: PwaManifestVariant): string {
  return variant === 'chat' ? '/manifest-chat.webmanifest' : '/manifest.webmanifest'
}

/** Pathname iOS should bookmark when adding the chat Home Screen icon. */
export function pwaInstallPathnameForVariant(variant: PwaManifestVariant): string {
  return variant === 'chat' ? '/chat' : '/'
}

/**
 * Standalone launch with an empty hash: prefer chat when the saved path is `/chat`
 * (iOS A2HS after hash strip / Chromium chat start_url), otherwise the translator.
 */
export function standaloneDefaultRoute(pathname: string): 'app' | 'chat' {
  const path = pathname.replace(/\/+$/, '') || '/'
  return path === '/chat' ? 'chat' : 'app'
}

/**
 * Pure URL shape for the active PWA surface.
 * Everyday chat → `/` + `#/chat`. Homescreen latch → `/chat` + `#/chat`.
 */
export function resolvePwaDocumentUrl(opts: {
  variant: PwaManifestVariant
  pathname: string
  search?: string
  hash?: string
  /** When true on chat, keep `/chat` so iOS A2HS survives hash strip. */
  homescreenLatch?: boolean
}): { pathname: string; search: string; hash: string } {
  const search = opts.search ?? ''
  let pathname = opts.pathname.replace(/\/+$/, '') || '/'
  let hash = opts.hash ?? ''

  if (opts.variant === 'chat') {
    if (opts.homescreenLatch) {
      pathname = '/chat'
    } else if (pathname === '/chat') {
      pathname = '/'
    }
    if (!/^#\/chat(?:\?|$)/.test(hash)) hash = '#/chat'
    return { pathname, search, hash }
  }

  if (pathname === '/chat') pathname = '/'
  return { pathname, search, hash }
}

let activeVariant: PwaManifestVariant | null = null
/** Brief `/chat` pathname while the chat iOS Home Screen tip is showing. */
let chatHomescreenPathLatch = false

function ensureManifestLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'manifest'
    document.head.appendChild(link)
  }
  return link
}

function setAppleTouchIcon(variant: PwaManifestVariant): void {
  const href = variant === 'chat' ? '/apple-touch-icon-chat.png' : '/apple-touch-icon.png'
  let link = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'apple-touch-icon'
    document.head.appendChild(link)
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href)
}

function setAppleTitle(variant: PwaManifestVariant): void {
  const title = variant === 'chat' ? APPLE_TITLE_CHAT : APPLE_TITLE_APP
  let meta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'apple-mobile-web-app-title'
    document.head.appendChild(meta)
  }
  if (meta.content !== title) meta.content = title
}

/**
 * Keep the address bar on `/#/chat` for normal browsing/share.
 * Optionally latch `/chat` while the iOS chat Home Screen tip is open.
 */
export function syncPwaInstallPathname(variant: PwaManifestVariant): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const next = resolvePwaDocumentUrl({
    variant,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    homescreenLatch: variant === 'chat' && chatHomescreenPathLatch,
  })
  const currentPath = url.pathname.replace(/\/+$/, '') || '/'
  if (currentPath === next.pathname && (url.hash || '') === next.hash && (url.search || '') === next.search) {
    return
  }
  window.history.replaceState(
    window.history.state,
    '',
    `${next.pathname}${next.search}${next.hash}`,
  )
}

/**
 * Latch `/chat` in the address bar while the chat iOS A2HS tip is visible, then
 * restore `/#/chat` when the tip dismisses.
 */
export function setChatHomescreenPathLatch(on: boolean): void {
  chatHomescreenPathLatch = on
  const onChat =
    typeof window !== 'undefined' && /^#\/chat(?:\?|$)/.test(window.location.hash || '')
  syncPwaInstallPathname(onChat || on ? 'chat' : 'app')
}

export function isChatHomescreenPathLatch(): boolean {
  return chatHomescreenPathLatch
}

/** Sync document install surface to `app` or `chat` based on the current route. */
export function syncPwaManifestLink(variant: PwaManifestVariant): void {
  if (typeof document === 'undefined') return

  // Normalize pathname even when variant is unchanged (e.g. soft nav left `/chat#/chat`).
  syncPwaInstallPathname(variant)

  if (activeVariant === variant) return

  const link = ensureManifestLink()
  const href = pwaManifestHref(variant)
  const prev = link.getAttribute(MANIFEST_LINK_ATTR)
  link.setAttribute('href', href)
  link.setAttribute(MANIFEST_LINK_ATTR, variant)
  setAppleTouchIcon(variant)
  setAppleTitle(variant)
  activeVariant = variant

  // Drop a stale beforeinstallprompt from the other variant so the install CTA
  // does not offer the wrong start_url / id.
  if (prev && prev !== variant) clearDeferredInstallPrompt()
}

export function pwaManifestVariantForRoute(route: string): PwaManifestVariant {
  return route === 'chat' ? 'chat' : 'app'
}

export function getActivePwaManifestVariant(): PwaManifestVariant | null {
  return activeVariant
}
