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
 *
 * Visit latch + live-video handoff: React Strict Mode (and effect re-runs)
 * remount the overlay without leaving `#/chat`. Module state survives so the
 * intro arms/plays once per chat shell visit, not once per effect pass.
 */
import {
  chatDeepAvatarIntroSrc,
  readChatDeepAvatarCharacter,
  type ChatDeepAvatarCharacterId,
} from './chatDeepAvatarCharacter'
import { readChatDeepAvatarSoundEnabled } from './chatDeepAvatarPersona'

/** Fullscreen companion intro plays at 3× (Henry). */
export const CHAT_DEEP_AVATAR_INTRO_PLAYBACK_RATE = 3

export type PrimedChatIntro = {
  character: ChatDeepAvatarCharacterId
  video: HTMLVideoElement
  /** True when the primed element is playing (or play() was accepted) unmuted. */
  unmuted: boolean
}

export type LiveChatIntroVideo = {
  visitId: number
  character: ChatDeepAvatarCharacterId
  src: string
  video: HTMLVideoElement
}

let primed: PrimedChatIntro | null = null

/** Monotonic id for the current `#/chat` shell visit. */
let chatShellVisitId = 0
/** Visit currently retained by ChatAuiPage (Strict Mode remount reuse). */
let retainedVisitId: number | null = null
let shellReleaseTimer: ReturnType<typeof setTimeout> | null = null
/** Character already armed for `chatShellVisitId` (skip Strict double-arm). */
let armedCharacterForVisit: { visitId: number; character: ChatDeepAvatarCharacterId } | null =
  null
/** Imperative video that survives overlay effect teardown within one visit. */
let liveIntro: LiveChatIntroVideo | null = null

function disposeVideoElement(video: HTMLVideoElement) {
  try {
    video.pause()
  } catch {
    /* ignore */
  }
  try {
    video.removeAttribute('src')
    video.load()
  } catch {
    /* ignore */
  }
}

function disposePrimed(entry: PrimedChatIntro | null) {
  if (!entry) return
  disposeVideoElement(entry.video)
}

/** Apply the locked intro rate (safe on any HTMLVideoElement). */
export function applyChatDeepAvatarIntroPlaybackRate(video: HTMLVideoElement) {
  try {
    video.playbackRate = CHAT_DEEP_AVATAR_INTRO_PLAYBACK_RATE
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
  applyChatDeepAvatarIntroPlaybackRate(video)
  void video.play().catch(() => {
    /* overlay will retry */
  })
}

/**
 * Retain a `#/chat` shell visit. Strict Mode remount cancels a pending release
 * and reuses the same visit id so the intro does not re-arm / restart.
 * Safe if the overlay already lazy-started the visit (child effects first).
 */
export function retainChatDeepAvatarIntroShell(): number {
  if (shellReleaseTimer != null) {
    clearTimeout(shellReleaseTimer)
    shellReleaseTimer = null
  }
  if (retainedVisitId != null) return retainedVisitId
  chatShellVisitId += 1
  retainedVisitId = chatShellVisitId
  armedCharacterForVisit = null
  clearLiveChatDeepAvatarIntroVideo()
  return chatShellVisitId
}

/**
 * Schedule visit release. Deferred so Strict Mode's immediate remount can
 * cancel via `retainChatDeepAvatarIntroShell`.
 */
export function releaseChatDeepAvatarIntroShell(): void {
  if (shellReleaseTimer != null) clearTimeout(shellReleaseTimer)
  shellReleaseTimer = setTimeout(() => {
    shellReleaseTimer = null
    retainedVisitId = null
    armedCharacterForVisit = null
    clearLiveChatDeepAvatarIntroVideo()
    clearPrimedChatDeepAvatarIntro()
  }, 0)
}

/** Current visit id; lazy-starts one if the overlay mounts before shell retain. */
export function getChatDeepAvatarIntroVisitId(): number {
  if (retainedVisitId != null) return retainedVisitId
  chatShellVisitId += 1
  retainedVisitId = chatShellVisitId
  return chatShellVisitId
}

/** True when this character was already armed for the current shell visit. */
export function wasChatDeepAvatarIntroArmed(
  character: ChatDeepAvatarCharacterId,
): boolean {
  const visit = getChatDeepAvatarIntroVisitId()
  return (
    armedCharacterForVisit != null &&
    armedCharacterForVisit.visitId === visit &&
    armedCharacterForVisit.character === character
  )
}

export function markChatDeepAvatarIntroArmed(character: ChatDeepAvatarCharacterId): void {
  armedCharacterForVisit = {
    visitId: getChatDeepAvatarIntroVisitId(),
    character,
  }
}

/** Clear arm latch so a companion pick change can re-play within the visit. */
export function clearChatDeepAvatarIntroArmed(): void {
  armedCharacterForVisit = null
}

export function peekLiveChatDeepAvatarIntroVideo(): LiveChatIntroVideo | null {
  return liveIntro
}

export function adoptLiveChatDeepAvatarIntroVideo(
  character: ChatDeepAvatarCharacterId,
  src: string,
): LiveChatIntroVideo | null {
  const visit = getChatDeepAvatarIntroVisitId()
  if (
    !liveIntro ||
    liveIntro.visitId !== visit ||
    liveIntro.character !== character ||
    liveIntro.src !== src
  ) {
    return null
  }
  return liveIntro
}

export function setLiveChatDeepAvatarIntroVideo(entry: LiveChatIntroVideo): void {
  if (liveIntro && liveIntro.video !== entry.video) {
    disposeVideoElement(liveIntro.video)
  }
  liveIntro = entry
}

export function clearLiveChatDeepAvatarIntroVideo(): void {
  if (liveIntro) {
    disposeVideoElement(liveIntro.video)
    liveIntro = null
  }
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
  applyChatDeepAvatarIntroPlaybackRate(video)
  // Muted play first (gesture-safe), then unmute in the same turn.
  video.muted = true

  const attempt = video.play()
  video.muted = false
  video.volume = 1

  if (attempt && typeof attempt.then === 'function') {
    void attempt
      .then(() => {
        if (primed?.video !== video) return
        applyChatDeepAvatarIntroPlaybackRate(video)
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
  applyChatDeepAvatarIntroPlaybackRate(out.video)
  return out
}

export function peekPrimedChatDeepAvatarIntro(): PrimedChatIntro | null {
  return primed
}
