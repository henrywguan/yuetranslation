import { env } from './env.js'

/** Strip trailing slash so Origin comparisons stay stable. */
function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function withWwwVariant(origin: string): string[] {
  try {
    const url = new URL(origin)
    if (!url.hostname || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return [normalizeOrigin(origin)]
    }
    const alts = new Set<string>([normalizeOrigin(origin)])
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4)
      alts.add(normalizeOrigin(url.origin))
    } else {
      url.hostname = `www.${url.hostname}`
      alts.add(normalizeOrigin(url.origin))
    }
    return [...alts]
  } catch {
    return [normalizeOrigin(origin)]
  }
}

/**
 * Browser Origins allowed to call the API with credentials.
 * Same-origin Vercel/PWA/TWA traffic often sends no cross-origin need; this
 * mainly protects true cross-origin browser calls (and local absolute API URLs).
 */
export function allowedCorsOrigins(): Set<string> {
  const set = new Set<string>()
  const add = (origin: string) => {
    for (const o of withWwwVariant(origin)) {
      if (o) set.add(o)
    }
  }

  if (env.appUrl) add(env.appUrl)

  // Production Vercel alias (stable project URL — not ephemeral preview deploys).
  add('https://jyuttranslate.vercel.app')

  // Local Vite / preview / direct API
  for (const host of ['localhost', '127.0.0.1']) {
    for (const port of [5173, 4173, 8787]) {
      set.add(`http://${host}:${port}`)
    }
  }

  for (const extra of env.corsExtraOrigins) add(extra)

  // Omit ephemeral *.vercel.app preview hosts (e.g. branch-git-…vercel.app).
  // Only the stable project alias above is allowlisted.

  return set
}

/**
 * cors package `origin` callback: reflect allowlisted Origins, deny others.
 * Requests with no Origin (curl, same-origin navigation, server webhooks) pass.
 */
export function corsOriginDelegate(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean | string) => void,
) {
  if (!origin) {
    callback(null, true)
    return
  }
  const allowed = allowedCorsOrigins()
  if (allowed.has(normalizeOrigin(origin))) {
    callback(null, origin)
    return
  }
  callback(null, false)
}
