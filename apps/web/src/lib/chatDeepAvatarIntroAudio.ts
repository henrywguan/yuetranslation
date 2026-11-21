/**
 * Companion intro audio unlock — keep Sound-on intros unmuted by default.
 *
 * Browsers block unmuted `video.play()` once the chat-open click has ended
 * (React mount + `canplay` are outside the gesture). Priming inside
 * `openDeepseekChat` / same-tick navigation starts playback under the gesture
 * so `#/chat` can adopt an already-playing unmuted element.
 *
 * Gesture trick: start `play()` muted (always allowed), then unmute in the
 * same synchronous turn — Chrome/Safari often keep the unlock. If the browser
 * remutes or rejects audible play, keep muted motion going so the overlay
 * never lands on a frozen hold frame.
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

function keepMutedMotion(video: HTMLVideoElement) {
  video.muted = true
  void video.play().catch(() => {
    /* overlay will retry */
  })
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
  video.volume = 1
  // Muted play first (gesture-safe), then unmute in the same turn.
  video.muted = true

  const attempt = video.play()
  video.muted = false
  video.volume = 1

  if (attempt && typeof attempt.then === 'function') {
    void attempt
      .then(() => {
        if (primed?.video !== video) return
        // Browser remuted us — keep motion; overlay shows Unmute.
        if (video.muted) {
          keepMutedMotion(video)
          primed.unmuted = false
          return
        }
        primed.unmuted = true
      })
      .catch(() => {
        // Audible play rejected — fall back to muted motion (never hold frame 0).
        keepMutedMotion(video)
        if (primed?.video === video) primed.unmuted = false
      })
  }

  primed = { character: id, video, unmuted: !video.muted && !video.paused }
}

/** Hand the primed element to the intro overlay (once). */
export function takePrimedChatDeepAvatarIntro(
  character: ChatDeepAvatarCharacterId,
): PrimedChatIntro | null {
  if (!primed || primed.character !== character) {
    return null
  }
  const out = primed
  primed = null
  return out
}

export function peekPrimedChatDeepAvatarIntro(): PrimedChatIntro | null {
  return primed
}
