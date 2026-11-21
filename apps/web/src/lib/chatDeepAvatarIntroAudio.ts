/**
 * Companion intro audio unlock — keep Sound-on intros unmuted by default.
 *
 * Browsers block unmuted `video.play()` once the chat-open click has ended
 * (React mount + `canplay` are outside the gesture). Priming inside
 * `openDeepseekChat` / same-tick navigation starts playback under the gesture
 * so `#/chat` can adopt an already-playing unmuted element.
 */
import {
  chatDeepAvatarIntroSrc,
  readChatDeepAvatarCharacter,
  type ChatDeepAvatarCharacterId,
} from './chatDeepAvatarCharacter'
import { readChatDeepAvatarSoundEnabled } from './chatDeepAvatarPersona'

export type PrimedChatIntro = {
  character: ChatDeepAvatarCharacterId
  video: HTMLVideoElement
  /** True when the primed element is playing (or play() was accepted) unmuted. */
  unmuted: boolean
}

let primed: PrimedChatIntro | null = null

function disposePrimed(entry: PrimedChatIntro | null) {
  if (!entry) return
  try {
    entry.video.pause()
  } catch {
    /* ignore */
  }
  try {
    entry.video.removeAttribute('src')
    entry.video.load()
  } catch {
    /* ignore */
  }
}

/** Drop a stale prime (character change / unmount without adopt). */
export function clearPrimedChatDeepAvatarIntro() {
  disposePrimed(primed)
  primed = null
}

/**
 * Start intro media inside a user gesture (Account Hub / chat launch).
 * Safe no-op when Companion Sound is off or no intro asset ships.
 */
export function primeChatDeepAvatarIntro(character?: ChatDeepAvatarCharacterId) {
  if (typeof document === 'undefined') return
  if (!readChatDeepAvatarSoundEnabled()) {
    clearPrimedChatDeepAvatarIntro()
    return
  }
  const id = character ?? readChatDeepAvatarCharacter()
  const src = chatDeepAvatarIntroSrc(id)
  if (!src) {
    clearPrimedChatDeepAvatarIntro()
    return
  }

  disposePrimed(primed)
  primed = null

  const video = document.createElement('video')
  video.src = src
  video.playsInline = true
  video.preload = 'auto'
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.muted = false
  video.volume = 1

  // Fire play() inside the gesture — do not await canplay.
  const attempt = video.play()
  if (attempt && typeof attempt.then === 'function') {
    void attempt
      .then(() => {
        if (primed?.video === video) primed.unmuted = !video.muted
      })
      .catch(() => {
        // Unmuted blocked even in-gesture (rare) — keep element for adopt; overlay retries.
        video.muted = true
        void video.play().catch(() => {
          /* overlay will remount its own element */
        })
        if (primed?.video === video) primed.unmuted = false
      })
  }

  primed = { character: id, video, unmuted: !video.muted }
}

/** Hand the primed element to the intro overlay (once). */
export function takePrimedChatDeepAvatarIntro(
  character: ChatDeepAvatarCharacterId,
): PrimedChatIntro | null {
  if (!primed || primed.character !== character) return null
  const out = primed
  primed = null
  return out
}

export function peekPrimedChatDeepAvatarIntro(): PrimedChatIntro | null {
  return primed
}
