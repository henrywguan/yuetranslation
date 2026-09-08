/**
 * Mic must not stay open when the page is backgrounded.
 * iOS Control Center shows an orange “Safari Websites” pill for any live
 * SpeechRecognition / getUserMedia track — including after Home / app switcher
 * if we only await session.stop() (the page can freeze first).
 */

export function shouldReleaseMicForVisibility(state: DocumentVisibilityState): boolean {
  return state === 'hidden'
}

/** Sync-first release: pagehide / freeze may not let an await finish. */
export function bindMicBackgroundRelease(release: () => void): () => void {
  const onVisibility = () => {
    if (typeof document !== 'undefined' && shouldReleaseMicForVisibility(document.visibilityState)) {
      release()
    }
  }
  const onLeave = () => release()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onLeave)
  window.addEventListener('freeze', onLeave)
  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onLeave)
    window.removeEventListener('freeze', onLeave)
  }
}
