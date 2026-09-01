import { fetchSpeechToken } from './api'
import { isAppleTouchDevice } from './mediaAccess'

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

/** Warm the cache after bootstrap so the first mic press is fast (desktop/Android). */
export function prefetchSpeechToken() {
  // On iPhone/iPad a warm token skips the gesture-safe Web Speech path and Azure
  // often listens with no audio after awaits — keep the token cold on Apple.
  if (isAppleTouchDevice()) return
  void getSpeechToken().catch(() => {
    /* Azure may be unconfigured — Web Speech fallback still works. */
  })
}
