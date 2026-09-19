/**
 * Mic must not stay open when the page is backgrounded.
 * iOS Control Center shows an orange “Safari Websites” pill for any live
 * SpeechRecognition / getUserMedia track — including after Home / app switcher
 * if we only await session.stop() (the page can freeze first).
 *
 * Desktop caveat: Chrome’s mic permission prompt (and some PWAs) can flip
 * `visibilityState` to `hidden` while `getUserMedia` is pending. Forcing a
 * release then aborts `startHold` with no error and no lasting permission UX.
 * So non-Apple pages only force-release once a live session exists.
 */

export function shouldReleaseMicForVisibility(state: DocumentVisibilityState): boolean {
  return state === 'hidden'
}

/**
 * Whether a background / hide event should tear down capture right now.
 * - Apple (iPhone/iPad): always — orange pill leak is release-blocking.
 * - Desktop: only once listening has started (`live` / session). Skip during
 *   the permission / Azure-start handshake.
 */
export function shouldForceReleaseMicOnBackground(opts: {
  apple: boolean
  live: boolean
  hasSession: boolean
}): boolean {
  if (opts.apple) return true
  return opts.live || opts.hasSession
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
