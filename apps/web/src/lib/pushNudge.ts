/** Soft one-time nudge to enable push after a “win” (e.g. phrasebook star). */

const KEY = 'yue.push.nudge.done'
const EVENT = 'yue:push-nudge'

export function pushNudgeAlreadyShown(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

export function markPushNudgeShown(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* ignore */
  }
}

/** Fire a window event so Account Hub / TranslatorApp can show a tip once. */
export function maybeOfferPushNudge(): void {
  if (typeof window === 'undefined') return
  if (pushNudgeAlreadyShown()) return
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function subscribePushNudge(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => cb()
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
