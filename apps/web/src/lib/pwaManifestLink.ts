/**
 * Point `<link rel="manifest">` at the translator or chat PWA manifest.
 * Distinct `id` + `start_url` let Chromium install two Home Screen / desktop icons.
 *
 * iOS Add to Home Screen bookmarks the **document URL** and often strips the hash.
 * Chat therefore keeps pathname `/chat` while on that route so A2HS survives as
 * `…/chat` (→ `#/chat`), not bare `/` which standalone boot maps to `#/app`.
 */
import { clearDeferredInstallPrompt } from './pwaInstallPrompt'

export type PwaManifestVariant = 'app' | 'chat'

const MANIFEST_LINK_ATTR = 'data-yue-pwa-variant'
const APPLE_TITLE_APP = 'JyutTranslate'
const APPLE_TITLE_CHAT = 'DeepSeek Chat'

export function pwaManifestHref(variant: PwaManifestVariant): string {
  return variant === 'chat' ? '/manifest-chat.webmanifest' : '/manifest.webmanifest'
}

/** Pathname iOS / Chromium should bookmark for this install surface. */
export function pwaInstallPathnameForVariant(variant: PwaManifestVariant): string {
  return variant === 'chat' ? '/chat' : '/'
}

/**
 * Standalone launch with an empty hash: prefer chat when the saved path is `/chat`
 * (iOS A2HS after hash strip), otherwise the translator.
 */
export function standaloneDefaultRoute(pathname: string): 'app' | 'chat' {
  const path = pathname.replace(/\/+$/, '') || '/'
  return path === '/chat' ? 'chat' : 'app'
}

let activeVariant: PwaManifestVariant | null = null

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
 * Keep `/chat` in the address bar on the chat route so iOS A2HS does not collapse
 * `/#/chat` → `/` (which then opens as the translator).
 */
export function syncPwaInstallPathname(variant: PwaManifestVariant): void {
  if (typeof window === 'undefined') return
  const wanted = pwaInstallPathnameForVariant(variant)
  const url = new URL(window.location.href)
  const current = url.pathname.replace(/\/+$/, '') || '/'
  if (variant === 'chat') {
    if (current === wanted) return
    url.pathname = wanted
    if (!/^#\/chat(?:\?|$)/.test(url.hash || '')) url.hash = '#/chat'
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    return
  }
  // Leaving chat: drop `/chat` so translator A2HS does not bookmark the chat path.
  if (current === '/chat') {
    url.pathname = '/'
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }
}

/** Sync document install surface to `app` or `chat` based on the current route. */
export function syncPwaManifestLink(variant: PwaManifestVariant): void {
  if (typeof document === 'undefined') return

  // Pathname must stay correct even when variant is unchanged (e.g. soft nav
  // restored `/#/chat` without `/chat`, or first paint before a prior swap).
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
