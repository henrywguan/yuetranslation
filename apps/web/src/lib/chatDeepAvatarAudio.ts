/**
 * Fullscreen companion SFX + character VO (intro-style).
 * Pre-baked mp3 under `public/chat-avatar/sfx` and `{boy,girl}/vo`.
 *
 * VO is each character’s personal Higgsfield voice (boy = Archie, girl = Pixie),
 * baked offline — never Azure Speech and never `/api/tts` at runtime.
 */
import {
  CHAT_DEEP_AVATAR_DIR,
  type ChatDeepAvatarCharacterId,
  type ChatDeepAvatarMood,
} from './chatDeepAvatarCharacter'
import { readChatDeepAvatarSoundEnabled } from './chatDeepAvatarPersona'

/** Best-effort unlock without importing `tts.ts` (keeps smokes free of Vite `import.meta`). */
function unlockAudioPlayback() {
  if (typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    void ctx.resume().finally(() => {
      void ctx.close()
    })
  } catch {
    /* ignore */
  }
}

type LipBus = {
  setPlaying: (playing: boolean) => void
  isBusy: () => boolean
}

/** Injected at call sites that already load the signals bus (avoids smoke → auth cycle). */
let lipBus: LipBus | null = null

export function bindChatDeepAvatarAudioLipBus(bus: LipBus) {
  lipBus = bus
}

const SFX_DIR = '/chat-avatar/sfx'

export type ChatDeepAvatarAudioEnergy = 'soft' | 'cheer' | 'hype'

export function chatDeepAvatarSfxSrc(mood: ChatDeepAvatarMood | string): string {
  const id = String(mood || 'celebrate')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
  return `${SFX_DIR}/${id || 'celebrate'}.mp3`
}

export function chatDeepAvatarVoSrc(
  character: ChatDeepAvatarCharacterId,
  mood: ChatDeepAvatarMood | string,
): string {
  const id = String(mood || 'celebrate')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
  return `${CHAT_DEEP_AVATAR_DIR[character]}/vo/${id || 'celebrate'}.mp3`
}

type PlayOpts = {
  character: ChatDeepAvatarCharacterId
  mood: ChatDeepAvatarMood | string
  /** Force sound even if soft mood (demos). */
  force?: boolean
  soundEnabled?: boolean
  /** Soft SFX volume when reply TTS is busy (0–1). */
  busySfxVolume?: number
}

type Session = {
  /** Monotonic play token — abandoned async plays must not touch a newer session. */
  gen: number
  sfx: HTMLAudioElement | null
  vo: HTMLAudioElement | null
  lips: boolean
}

let active: Session | null = null
/** Bumped on every stop / new play so Strict Mode remounts cannot double-fire beds. */
let playGen = 0

function disposeAudio(a: HTMLAudioElement | null) {
  if (!a) return
  try {
    a.pause()
    a.removeAttribute('src')
    a.load()
  } catch {
    /* ignore */
  }
}

function stopSession() {
  playGen += 1
  const s = active
  active = null
  if (!s) return
  disposeAudio(s.sfx)
  disposeAudio(s.vo)
  if (s.lips) lipBus?.setPlaying(false)
}

function isCurrent(gen: number): boolean {
  return active?.gen === gen
}

export function stopChatDeepAvatarEmotionAudio() {
  stopSession()
}

/**
 * Play SFX (+ VO when not talking over reply TTS).
 * One call owns one SFX bed + one VO line; superseded plays no-op mid-flight
 * (React Strict Mode double-mount, effect re-entry, stacked outro+play).
 */
export async function playChatDeepAvatarEmotionAudio(opts: PlayOpts): Promise<{
  played: boolean
  needsUnmute: boolean
  stop: () => void
}> {
  stopSession()
  const soundOn = opts.soundEnabled ?? readChatDeepAvatarSoundEnabled()
  if (!soundOn) {
    return { played: false, needsUnmute: false, stop: stopSession }
  }

  const myGen = playGen
  unlockAudioPlayback()

  // Another stop/play may have run during unlock — abandon orphans.
  if (myGen !== playGen) {
    return { played: false, needsUnmute: false, stop: stopSession }
  }

  const ttsBusy = Boolean(lipBus?.isBusy())
  const sfx = new Audio(chatDeepAvatarSfxSrc(opts.mood))
  sfx.preload = 'auto'
  sfx.volume = ttsBusy ? Math.min(0.35, opts.busySfxVolume ?? 0.28) : 0.55

  let vo: HTMLAudioElement | null = null
  if (!ttsBusy) {
    vo = new Audio(chatDeepAvatarVoSrc(opts.character, opts.mood))
    vo.preload = 'auto'
    vo.volume = 0.9
  }

  if (myGen !== playGen) {
    disposeAudio(sfx)
    disposeAudio(vo)
    return { played: false, needsUnmute: false, stop: stopSession }
  }

  active = { gen: myGen, sfx, vo, lips: false }

  const tryPlay = async (audio: HTMLAudioElement, muted: boolean) => {
    if (!isCurrent(myGen)) return false
    audio.muted = muted
    await audio.play()
    return isCurrent(myGen)
  }

  let needsUnmute = false
  try {
    const ok = await tryPlay(sfx, false)
    if (!ok) return { played: false, needsUnmute: false, stop: stopSession }
  } catch {
    try {
      const ok = await tryPlay(sfx, true)
      if (!ok) return { played: false, needsUnmute: false, stop: stopSession }
      needsUnmute = true
    } catch {
      if (isCurrent(myGen)) stopSession()
      return { played: false, needsUnmute: false, stop: stopSession }
    }
  }

  if (vo && isCurrent(myGen)) {
    try {
      const ok = await tryPlay(vo, needsUnmute)
      if (ok && isCurrent(myGen) && active) {
        active.lips = true
        lipBus?.setPlaying(true)
        vo.onended = () => {
          if (active?.gen === myGen && active.vo === vo) {
            lipBus?.setPlaying(false)
            active.lips = false
          }
        }
      }
    } catch {
      try {
        const ok = await tryPlay(vo, true)
        if (ok && isCurrent(myGen) && active) {
          needsUnmute = true
          active.lips = true
          lipBus?.setPlaying(true)
        }
      } catch {
        if (isCurrent(myGen) && active) active.vo = null
      }
    }
  }

  if (!isCurrent(myGen)) {
    return { played: false, needsUnmute: false, stop: stopSession }
  }

  return { played: true, needsUnmute, stop: stopSession }
}

export function unmuteChatDeepAvatarEmotionAudio() {
  const s = active
  if (!s) return
  for (const a of [s.sfx, s.vo]) {
    if (!a) continue
    a.muted = false
    void a.play().catch(() => {
      /* ignore */
    })
  }
}
