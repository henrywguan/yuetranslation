/**
 * Same-origin / hash navigation guards — block phishing via ?api=, ?upgrade=,
 * site link query overrides, and push notification absolute URLs.
 */

/** Relative same-origin path (no protocol-relative `//`). */
export function isSafeRelativePath(url: string): boolean {
  const t = url.trim()
  return t.startsWith('/') && !t.startsWith('//')
}

/** In-app hash route. */
export function isSafeHashRoute(url: string): boolean {
  return url.trim().startsWith('#/')
}

/**
 * True when `url` is safe to navigate or use as API base from this origin.
 * Allows: `#/…`, `/…` (same origin), and absolute URLs whose origin matches `origin`.
 */
export function isSafeAppUrl(url: string, origin: string): boolean {
  const t = url.trim()
  if (!t) return false
  if (isSafeHashRoute(t) || isSafeRelativePath(t)) return true
  try {
    const base = origin || 'http://localhost'
    const u = new URL(t, base)
    const o = new URL(base)
    return u.origin === o.origin
  } catch {
    return false
  }
}

/** Normalize a safe API base; never returns a foreign host. */
export function sanitizeApiBase(candidate: string | null | undefined, fallback: string, origin?: string): string {
  const fb = (fallback || '/api').replace(/\/$/, '') || '/api'
  if (!candidate?.trim()) return fb
  const trimmed = candidate.trim().replace(/\/$/, '') || '/api'
  if (isSafeRelativePath(trimmed)) return trimmed
  if (typeof origin === 'string' && origin) {
    try {
      const u = new URL(trimmed, origin)
      if (u.origin === new URL(origin).origin) {
        return (u.pathname.replace(/\/$/, '') || '/api') + u.search
      }
    } catch {
      /* fall through */
    }
  }
  return fb
}

/** Safe external leave URL — only same-origin absolutes or relative paths. */
export function sanitizeLeaveUrl(url: string, origin: string): string | null {
  const t = url.trim()
  if (!t) return null
  if (!isSafeAppUrl(t, origin)) return null
  if (isSafeHashRoute(t) || isSafeRelativePath(t)) return t
  try {
    return new URL(t, origin).href
  } catch {
    return null
  }
}

/** Push / SW navigation target — hash, same-origin path, or same-origin absolute. */
export function sanitizePushNavigateUrl(url: string, origin: string): string {
  const t = (url || '').trim() || '#/app'
  if (isSafeHashRoute(t)) return t
  if (isSafeRelativePath(t)) return t
  try {
    const u = new URL(t, origin)
    if (u.origin === new URL(origin).origin) {
      return `${u.pathname}${u.search}${u.hash}` || '#/app'
    }
  } catch {
    /* ignore */
  }
  return '#/app'
}
