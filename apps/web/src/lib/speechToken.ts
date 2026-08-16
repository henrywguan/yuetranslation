import { fetchSpeechToken } from './api'

type SpeechToken = { token: string; region: string; fetchedAt: number }

/** Reuse tokens briefly so mic start doesn’t wait on the network (helps iOS gestures). */
const TOKEN_TTL_MS = 4 * 60 * 1000

let cached: SpeechToken | null = null
let inflight: Promise<SpeechToken | null> | null = null

export function peekSpeechToken(): SpeechToken | null {
  if (!cached) return null
  if (Date.now() - cached.fetchedAt > TOKEN_TTL_MS) {
    cached = null
    return null
  }
  return cached
}

export async function getSpeechToken(opts?: { force?: boolean }): Promise<SpeechToken | null> {
  if (!opts?.force) {
    const hit = peekSpeechToken()
    if (hit) return hit
  }
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const t = await fetchSpeechToken()
      if (!t?.token || !t.region) {
        cached = null
        return null
      }
      cached = { token: t.token, region: t.region, fetchedAt: Date.now() }
      return cached
    } catch (err) {
      cached = null
      throw err
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** Warm the cache after bootstrap so the first mic press is fast. */
export function prefetchSpeechToken() {
  void getSpeechToken().catch(() => {
    /* Azure may be unconfigured — Web Speech fallback still works. */
  })
}
