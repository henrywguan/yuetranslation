/**
 * Tab / favicon “needs you” when a backgrounded `#/chat` hits needs_attention.
 * Clears on focus / visible — not a Cursor Listening clone.
 */

export const CHAT_NEEDS_YOU_TITLE_PREFIX = '(Needs you) '

const ATTENTION_FAVICON_HREF =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" rx="14" fill="#0b3d36"/>` +
      `<circle cx="48" cy="16" r="12" fill="#e85d4c"/>` +
      `</svg>`,
  )

export function shouldShowNeedsYouAttention(opts: {
  documentHidden: boolean
  hasNeedsAttention: boolean
}): boolean {
  return Boolean(opts.documentHidden && opts.hasNeedsAttention)
}

export function withNeedsYouTitle(baseTitle: string, active: boolean): string {
  const base = String(baseTitle || '').replace(/^\(Needs you\)\s+/i, '').trim() || 'DeepSeek Chat'
  if (!active) return base
  if (base.startsWith(CHAT_NEEDS_YOU_TITLE_PREFIX)) return base
  return `${CHAT_NEEDS_YOU_TITLE_PREFIX}${base}`
}

/** Swap the primary icon link to a badged data-URI; restore previous hrefs on clear. */
export function setNeedsYouFavicon(active: boolean): void {
  if (typeof document === 'undefined') return
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]'),
  )
  if (!links.length) return
  for (const link of links) {
    const prev = link.getAttribute('data-yue-icon-href')
    if (active) {
      if (!prev) link.setAttribute('data-yue-icon-href', link.getAttribute('href') || '')
      link.setAttribute('href', ATTENTION_FAVICON_HREF)
    } else if (prev != null) {
      link.setAttribute('href', prev)
      link.removeAttribute('data-yue-icon-href')
    }
  }
}
