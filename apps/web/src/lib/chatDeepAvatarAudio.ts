/**
 * Fullscreen companion SFX + character VO (intro-style).
 * Pre-baked mp3 under `public/chat-avatar/sfx` and `{boy,girl}/vo`.
 * Never calls metered /api/tts at runtime.
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
  sfx: HTMLAudioElement | null
  vo: HTMLAudioElement | null
  lips: boolean
}

let active: Session | null = null

function stopSession() {
  const s = active
  active = null
  if (!s) return
  for (const a of [s.sfx, s.vo]) {
    if (!a) continue
    try {
      a.pause()
      a.removeAttribute('src')
      a.load()
    } catch {
      /* ignore */
    }
  }
  if (s.lips) lipBus?.setPlaying(false)
}

export function stopChatDeepAvatarEmotionAudio() {
  stopSession()
}

/**
 * Play SFX (+ VO when not talking over reply TTS).
 * Returns whether VO started (for unmute UI) and a promise that settles when audio ends.
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

  unlockAudioPlayback()
  const ttsBusy = Boolean(lipBus?.isBusy())
  const sfx = new Audio(chatDeepAvatarSfxSrc(opts.mood))
  sfx.preload = 'auto'
  sfx.volume = ttsBusy ? Math.min(0.35, opts.busySfxVolume ?? 0.28) : 0.55

  let vo: HTMLAudioElement | null = null
  let lips = false
  if (!ttsBusy) {
    vo = new Audio(chatDeepAvatarVoSrc(opts.character, opts.mood))
    vo.preload = 'auto'
    vo.volume = 0.9
  }

  active = { sfx, vo, lips: false }

  const tryPlay = async (audio: HTMLAudioElement, muted: boolean) => {
    audio.muted = muted
    await audio.play()
  }

  let needsUnmute = false
  try {
    await tryPlay(sfx, false)
  } catch {
    try {
      await tryPlay(sfx, true)
      needsUnmute = true
    } catch {
      stopSession()
      return { played: false, needsUnmute: false, stop: stopSession }
    }
  }

  if (vo) {
    try {
      await tryPlay(vo, needsUnmute)
      lips = true
      if (active) active.lips = true
      lipBus?.setPlaying(true)
      vo.onended = () => {
        if (active?.vo === vo) {
          lipBus?.setPlaying(false)
          if (active) active.lips = false
        }
      }
    } catch {
      try {
        await tryPlay(vo, true)
        needsUnmute = true
        lips = true
        if (active) active.lips = true
        lipBus?.setPlaying(true)
      } catch {
        vo = null
        if (active) active.vo = null
      }
    }
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
