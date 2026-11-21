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
import { agentDebugLog } from './agentDebugLog'

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
  // #region agent log
  const soundOn = readChatDeepAvatarSoundEnabled()
  agentDebugLog('B', 'chatDeepAvatarIntroAudio.ts:prime', 'primeChatDeepAvatarIntro called', {
    soundOn,
    hasDoc: true,
  })
  // #endregion
  if (!soundOn) {
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
        // #region agent log
        agentDebugLog('B', 'chatDeepAvatarIntroAudio.ts:prime.then', 'prime unmuted play accepted', {
          muted: video.muted,
          paused: video.paused,
          unmuted: primed?.unmuted,
        })
        // #endregion
      })
      .catch((err: unknown) => {
        // Unmuted blocked even in-gesture (rare) — keep element for adopt; overlay retries.
        // #region agent log
        agentDebugLog('A', 'chatDeepAvatarIntroAudio.ts:prime.catch', 'prime unmuted play rejected', {
          err: String(err),
          name: (err as { name?: string })?.name,
        })
        // #endregion
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
  if (!primed || primed.character !== character) {
    // #region agent log
    agentDebugLog('B', 'chatDeepAvatarIntroAudio.ts:take', 'takePrimed miss', {
      wanted: character,
      had: primed?.character ?? null,
    })
    // #endregion
    return null
  }
  const out = primed
  primed = null
  // #region agent log
  agentDebugLog('B', 'chatDeepAvatarIntroAudio.ts:take', 'takePrimed hit', {
    character: out.character,
    unmuted: out.unmuted,
    muted: out.video.muted,
    paused: out.video.paused,
  })
  // #endregion
  return out
}

export function peekPrimedChatDeepAvatarIntro(): PrimedChatIntro | null {
  return primed
}
