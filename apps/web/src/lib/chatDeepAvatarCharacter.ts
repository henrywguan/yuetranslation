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
 * Clip moods + CSS-variant outros (`proud` / `eureka` reuse happy/celebrate GIFs
 * until Henry OKs new Higgsfield assets).
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

/** On-disk GIF stems under `public/chat-avatar/{boy,girl}/`. */
const ASSET_MOODS = [
  'idle',
  'happy',
  'think',
  'speak',
  'listen',
  'concern',
  'celebrate',
] as const satisfies readonly ChatDeepAvatarMood[]

/** Public asset folder per character (`apps/web/public/chat-avatar/...`). */
export const CHAT_DEEP_AVATAR_DIR: Record<ChatDeepAvatarCharacterId, string> = {
  boy: '/chat-avatar/boy',
  girl: '/chat-avatar/girl',
}

/** Agent/Plan/Search run length that counts as a “deep finish”. */
export const CHAT_DEEP_AVATAR_DEEP_MS = 15_000

/** Ask / very short wins latch `proud` (happy GIF) instead of celebrate. */
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
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_DEEP_AVATAR_CHARACTER_EVENT, { detail: next }))
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
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_DEEP_AVATAR_CELEBRATE_MODE_EVENT, { detail: next }))
  }
}

/** Map display/CSS moods onto shipped GIF filenames (no new public assets). */
export function chatDeepAvatarMoodAssetStem(mood: ChatDeepAvatarMood): (typeof ASSET_MOODS)[number] {
  if (mood === 'proud') return 'happy'
  if (mood === 'eureka') return 'celebrate'
  if ((ASSET_MOODS as readonly string[]).includes(mood)) {
    return mood as (typeof ASSET_MOODS)[number]
  }
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
 * Post-run outro mood. `proud` / `eureka` are CSS variants on happy/celebrate GIFs.
 * Default remains celebrate.
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
  return mood === 'celebrate' || mood === 'happy' || mood === 'proud' || mood === 'eureka'
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
