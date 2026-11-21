/**
 * Point `<link rel="manifest">` at the translator or chat PWA manifest.
 * Distinct `id` + `start_url` let Chromium install two Home Screen / desktop icons.
 */
import { clearDeferredInstallPrompt } from './pwaInstallPrompt'

export type PwaManifestVariant = 'app' | 'chat'

const MANIFEST_LINK_ATTR = 'data-yue-pwa-variant'
const APPLE_TITLE_APP = 'JyutTranslate'
const APPLE_TITLE_CHAT = 'DeepSeek Chat'

export function pwaManifestHref(variant: PwaManifestVariant): string {
  return variant === 'chat' ? '/manifest-chat.webmanifest' : '/manifest.webmanifest'
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

/** Sync document install surface to `app` or `chat` based on the current route. */
export function syncPwaManifestLink(variant: PwaManifestVariant): void {
  if (typeof document === 'undefined') return
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
