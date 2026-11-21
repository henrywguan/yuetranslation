/**
 * `#/chat` companion character pick — DS Boy / DS Girl.
 * Device-local preference (same pattern as composer prefs).
 *
 * Celebrate fullscreen mode (Every success / Deep finishes / Frame only)
 * lives beside the character pick in Inbox settings → Companion.
 */

export type ChatDeepAvatarCharacterId = 'boy' | 'girl'

export const CHAT_DEEP_AVATAR_CHARACTER_KEY = 'yue-deepseek-chat-avatar-character-v1'

/** Sidebar Celebrate: fullscreen trigger preference. */
export const CHAT_DEEP_AVATAR_CELEBRATE_MODE_KEY = 'yue-deepseek-chat-avatar-celebrate-v1'

export const CHAT_DEEP_AVATAR_CHARACTERS: readonly ChatDeepAvatarCharacterId[] = [
  'boy',
  'girl',
] as const

export const CHAT_DEEP_AVATAR_CHARACTER_LABEL: Record<ChatDeepAvatarCharacterId, string> = {
  boy: 'DS Boy',
  girl: 'DS Girl',
}

/** Fullscreen celebrate trigger — default every successful outro. */
export type ChatDeepAvatarCelebrateMode = 'every' | 'deep' | 'frame'

export const CHAT_DEEP_AVATAR_CELEBRATE_MODES: readonly ChatDeepAvatarCelebrateMode[] = [
  'every',
  'deep',
  'frame',
] as const

export const CHAT_DEEP_AVATAR_CELEBRATE_MODE_LABEL: Record<ChatDeepAvatarCelebrateMode, string> = {
  every: 'Every success',
  deep: 'Deep finishes',
  frame: 'Frame only',
}

export const CHAT_DEEP_AVATAR_CELEBRATE_MODE_HINT: Record<ChatDeepAvatarCelebrateMode, string> = {
  every: 'Fullscreen pop-out on each celebrate',
  deep: 'Fullscreen when Agent/Plan/Search lasts ≥15s or Plan→Build completes',
  frame: 'Keep celebrate in the portrait tile',
}

/**
 * Clip moods under `public/chat-avatar/{boy,girl}/deep-{mood}.gif`.
 * Outros: `proud` (Ask / short win), `eureka` (Search / long research), `celebrate` (default).
 * Performance moods: bow / fist / wave / nod / relieved / sleepy (showcase + tools).
 */
export type ChatDeepAvatarMood =
  | 'idle'
  | 'happy'
  | 'think'
  | 'speak'
  | 'listen'
  | 'concern'
  | 'celebrate'
  | 'proud'
  | 'eureka'
  | 'bow'
  | 'fist'
  | 'wave'
  | 'nod'
  | 'relieved'
  | 'sleepy'

/** On-disk GIF stems under `public/chat-avatar/{boy,girl}/`. */
const ASSET_MOODS = [
  'idle',
  'happy',
  'think',
  'speak',
  'listen',
  'concern',
  'celebrate',
  'proud',
  'eureka',
  'bow',
  'fist',
  'wave',
  'nod',
  'relieved',
  'sleepy',
] as const satisfies readonly ChatDeepAvatarMood[]

/**
 * Fallback stem when a dedicated GIF is not shipped yet.
 * New performance moods map onto closest existing clips until Higgsfield replaces them.
 */
const ASSET_STEM_FALLBACK: Partial<Record<ChatDeepAvatarMood, (typeof ASSET_MOODS)[number]>> = {
  // Prefer dedicated files when present; stem helper checks ASSET_MOODS first.
}

/** Public asset folder per character (`apps/web/public/chat-avatar/...`). */
export const CHAT_DEEP_AVATAR_DIR: Record<ChatDeepAvatarCharacterId, string> = {
  boy: '/chat-avatar/boy',
  girl: '/chat-avatar/girl',
}

/** Agent/Plan/Search run length that counts as a “deep finish”. */
export const CHAT_DEEP_AVATAR_DEEP_MS = 15_000

/** Ask / very short wins latch `proud` instead of celebrate. */
export const CHAT_DEEP_AVATAR_SHORT_MS = 4_000

export function normalizeChatDeepAvatarCharacter(raw: unknown): ChatDeepAvatarCharacterId {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'girl' || v === 'ds-girl' || v === 'ds_girl') return 'girl'
  return 'boy'
}

export function readChatDeepAvatarCharacter(
  fallback: ChatDeepAvatarCharacterId = 'boy',
): ChatDeepAvatarCharacterId {
  try {
    return normalizeChatDeepAvatarCharacter(
      localStorage.getItem(CHAT_DEEP_AVATAR_CHARACTER_KEY) || fallback,
    )
  } catch {
    return fallback
  }
}

/** Same-tab sync when Inbox settings and the composer portrait both mount the hook. */
export const CHAT_DEEP_AVATAR_CHARACTER_EVENT = 'yue-deepseek-chat-avatar-character'

export function writeChatDeepAvatarCharacter(id: ChatDeepAvatarCharacterId) {
  const next = normalizeChatDeepAvatarCharacter(id)
  try {
    localStorage.setItem(CHAT_DEEP_AVATAR_CHARACTER_KEY, next)
    localStorage.setItem('yue-deepseek-chat-avatar-cloud-updated-v1', new Date().toISOString())
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_DEEP_AVATAR_CHARACTER_EVENT, { detail: next }))
    window.dispatchEvent(new CustomEvent('yue-deepseek-chat-avatar-prefs-changed'))
  }
}

export function normalizeChatDeepAvatarCelebrateMode(raw: unknown): ChatDeepAvatarCelebrateMode {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'deep' || v === 'deep-finishes' || v === 'deep_finishes') return 'deep'
  if (v === 'frame' || v === 'frame-only' || v === 'frame_only' || v === 'portrait') return 'frame'
  if (v === 'every' || v === 'every-success' || v === 'every_success' || v === 'all') return 'every'
  return 'every'
}

export function readChatDeepAvatarCelebrateMode(
  fallback: ChatDeepAvatarCelebrateMode = 'every',
): ChatDeepAvatarCelebrateMode {
  try {
    const raw = localStorage.getItem(CHAT_DEEP_AVATAR_CELEBRATE_MODE_KEY)
    if (raw == null || raw === '') return fallback
    return normalizeChatDeepAvatarCelebrateMode(raw)
  } catch {
    return fallback
  }
}

export const CHAT_DEEP_AVATAR_CELEBRATE_MODE_EVENT = 'yue-deepseek-chat-avatar-celebrate'

export function writeChatDeepAvatarCelebrateMode(mode: ChatDeepAvatarCelebrateMode) {
  const next = normalizeChatDeepAvatarCelebrateMode(mode)
  try {
    localStorage.setItem(CHAT_DEEP_AVATAR_CELEBRATE_MODE_KEY, next)
    localStorage.setItem('yue-deepseek-chat-avatar-cloud-updated-v1', new Date().toISOString())
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_DEEP_AVATAR_CELEBRATE_MODE_EVENT, { detail: next }))
    window.dispatchEvent(new CustomEvent('yue-deepseek-chat-avatar-prefs-changed'))
  }
}

/** Closest shipped GIF when a dedicated performance clip is missing at runtime. */
const RUNTIME_STEM_FALLBACK: Record<string, (typeof ASSET_MOODS)[number]> = {
  bow: 'proud',
  fist: 'celebrate',
  wave: 'happy',
  nod: 'proud',
  relieved: 'happy',
  sleepy: 'idle',
}

/** Map display moods onto shipped GIF stems (`deep-{stem}.gif`). */
export function chatDeepAvatarMoodAssetStem(mood: ChatDeepAvatarMood): (typeof ASSET_MOODS)[number] {
  if ((ASSET_MOODS as readonly string[]).includes(mood)) {
    return mood as (typeof ASSET_MOODS)[number]
  }
  const fb = RUNTIME_STEM_FALLBACK[mood] || ASSET_STEM_FALLBACK[mood]
  if (fb) return fb
  return 'idle'
}

export function chatDeepAvatarMoodSrc(
  character: ChatDeepAvatarCharacterId,
  mood: ChatDeepAvatarMood,
): string {
  return `${CHAT_DEEP_AVATAR_DIR[character]}/deep-${chatDeepAvatarMoodAssetStem(mood)}.gif`
}

export function chatDeepAvatarPosterSrc(character: ChatDeepAvatarCharacterId): string {
  return `${CHAT_DEEP_AVATAR_DIR[character]}/deep-bust.png`
}

/**
 * Fullscreen companion intro MP4 under `public/chat-avatar/{id}/intro.mp4`.
 * Returns null only if a character folder has no shipped clip yet.
 */
export function chatDeepAvatarIntroSrc(character: ChatDeepAvatarCharacterId): string | null {
  const id = normalizeChatDeepAvatarCharacter(character)
  return `${CHAT_DEEP_AVATAR_DIR[id]}/intro.mp4`
}

/** Optional still shown while the intro MP4 buffers. */
export function chatDeepAvatarIntroPosterSrc(character: ChatDeepAvatarCharacterId): string | null {
  const id = normalizeChatDeepAvatarCharacter(character)
  return `${CHAT_DEEP_AVATAR_DIR[id]}/intro-poster.jpg`
}

/** Per-character “intro already seen” map — once until cleared / storage wipe. */
export const CHAT_DEEP_AVATAR_INTRO_SEEN_KEY = 'yue-deepseek-chat-avatar-intro-seen-v1'

type IntroSeenMap = Partial<Record<ChatDeepAvatarCharacterId, boolean>>

function readChatDeepAvatarIntroSeen(): IntroSeenMap {
  try {
    const raw = localStorage.getItem(CHAT_DEEP_AVATAR_INTRO_SEEN_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: IntroSeenMap = {}
    for (const id of CHAT_DEEP_AVATAR_CHARACTERS) {
      if ((parsed as Record<string, unknown>)[id] === true) out[id] = true
    }
    return out
  } catch {
    return {}
  }
}

export function hasSeenChatDeepAvatarIntro(character: ChatDeepAvatarCharacterId): boolean {
  return readChatDeepAvatarIntroSeen()[character] === true
}

export function markChatDeepAvatarIntroSeen(character: ChatDeepAvatarCharacterId) {
  try {
    const next = { ...readChatDeepAvatarIntroSeen(), [character]: true }
    localStorage.setItem(CHAT_DEEP_AVATAR_INTRO_SEEN_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
}

/** Whether this character should attempt the fullscreen intro overlay. */
export function shouldPlayChatDeepAvatarIntro(character: ChatDeepAvatarCharacterId): boolean {
  return Boolean(chatDeepAvatarIntroSrc(character)) && !hasSeenChatDeepAvatarIntro(character)
}

/** All mood + poster paths for a character (smoke / preload). */
export function chatDeepAvatarAssetPaths(character: ChatDeepAvatarCharacterId): string[] {
  const dir = CHAT_DEEP_AVATAR_DIR[character]
  return [...ASSET_MOODS.map((m) => `${dir}/deep-${m}.gif`), `${dir}/deep-bust.png`]
}

export type ChatDeepAvatarOutroPickInput = {
  durationMs: number
  composerMode: 'agent' | 'ask' | 'plan'
  searchOn: boolean
  planBuild: boolean
}

/** Whether this finished turn qualifies for “Deep finishes” fullscreen. */
export function isChatDeepAvatarDeepFinish(input: ChatDeepAvatarOutroPickInput): boolean {
  if (input.planBuild) return true
  if (input.durationMs < CHAT_DEEP_AVATAR_DEEP_MS) return false
  return input.composerMode === 'agent' || input.composerMode === 'plan' || input.searchOn
}

/**
 * Post-run outro mood. `proud` = Ask/short win; `eureka` = Search/long research;
 * default `celebrate`.
 */
export function pickChatDeepAvatarOutroMood(input: ChatDeepAvatarOutroPickInput): ChatDeepAvatarMood {
  if (input.searchOn && (input.planBuild || input.durationMs >= CHAT_DEEP_AVATAR_SHORT_MS)) {
    return 'eureka'
  }
  if (input.composerMode === 'ask' || input.durationMs < CHAT_DEEP_AVATAR_SHORT_MS) {
    return 'proud'
  }
  return 'celebrate'
}

export function isChatDeepAvatarOutroMood(mood: ChatDeepAvatarMood): boolean {
  return (
    mood === 'celebrate' ||
    mood === 'happy' ||
    mood === 'proud' ||
    mood === 'eureka' ||
    mood === 'bow' ||
    mood === 'fist' ||
    mood === 'wave' ||
    mood === 'nod' ||
    mood === 'relieved' ||
    mood === 'sleepy'
  )
}

/** Fullscreen pop-out gate from sidebar pref + reduced-motion + deep latch. */
export function shouldFullscreenCelebrate(opts: {
  celebrateMode: ChatDeepAvatarCelebrateMode
  deepFinish: boolean
  reducedMotion: boolean
  outroActive: boolean
}): boolean {
  if (!opts.outroActive || opts.reducedMotion) return false
  if (opts.celebrateMode === 'frame') return false
  if (opts.celebrateMode === 'every') return true
  return opts.deepFinish
}

export { ASSET_MOODS as CHAT_DEEP_AVATAR_MOODS }
