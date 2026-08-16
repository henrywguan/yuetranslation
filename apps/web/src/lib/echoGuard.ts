import { isTtsPlaying } from './tts'

/** Ignore mic while TTS plays and briefly after — blocks speaker echo becoming a new turn. */
const ECHO_TAIL_MS = 600

/** Shared echo-guard for Azure + Web Speech live sessions. */
export function createEchoGuard() {
  let playbackActive = false
  let ignoreUntil = 0

  return {
    shouldIgnoreMic() {
      return playbackActive || isTtsPlaying() || Date.now() < ignoreUntil
    },
    setPlaybackActive(active: boolean) {
      // Only arm the post-TTS mute when playback actually ends (true → false).
      // Calling setPlaybackActive(false) on every STT update must NOT mute the mic.
      if (!active) {
        if (playbackActive) ignoreUntil = Date.now() + ECHO_TAIL_MS
        playbackActive = false
        return
      }
      playbackActive = true
    },
  }
}
