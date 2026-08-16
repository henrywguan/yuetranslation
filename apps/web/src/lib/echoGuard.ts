import { isTtsPlaying } from './tts'

/** Ignore mic while TTS plays and briefly after — blocks speaker echo becoming a new turn. */
export const ECHO_TAIL_MS = 600

/** Shared echo-guard for Azure + Web Speech live sessions. */
export function createEchoGuard() {
  let playbackActive = false
  let ignoreUntil = 0

  return {
    shouldIgnoreMic() {
      return playbackActive || isTtsPlaying() || Date.now() < ignoreUntil
    },
    setPlaybackActive(active: boolean) {
      playbackActive = active
      if (!active) ignoreUntil = Date.now() + ECHO_TAIL_MS
    },
  }
}
