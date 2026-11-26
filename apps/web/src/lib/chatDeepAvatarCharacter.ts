/**
 * `#/chat` companion character pick — DS Boy / DS Girl / Both.
 * Device-local preference (same pattern as composer prefs).
 *
 * Celebrate fullscreen mode (Every success / Deep finishes / Frame only)
 * lives beside the character pick in Inbox settings → Companion.
 *
 * Both = always side-by-side solo portraits (not Overseer/Worker mapped).
 * Pair clips under `public/chat-avatar/both/pair-*.gif` power high-energy popups.
 */

/** Solo asset / rename keys — names stay per-solo even in Both mode. */
export type ChatDeepAvatarSoloId = 'boy' | 'girl'

/** Companion picker id (includes duo mode). */
export type ChatDeepAvatarCharacterId = ChatDeepAvatarSoloId | 'both'

export const CHAT_DEEP_AVATAR_CHARACTER_KEY = 'yue-deepseek-chat-avatar-character-v1'

/** Sidebar Celebrate: fullscreen trigger preference. */
export const CHAT_DEEP_AVATAR_CELEBRATE_MODE_KEY = 'yue-deepseek-chat-avatar-celebrate-v1'

export const CHAT_DEEP_AVATAR_SOLOS: readonly ChatDeepAvatarSoloId[] = ['boy', 'girl'] as const

export const CHAT_DEEP_AVATAR_CHARACTERS: readonly ChatDeepAvatarCharacterId[] = [
  'boy',
  'girl',
  'both',
] as const

export const CHAT_DEEP_AVATAR_CHARACTER_LABEL: Record<ChatDeepAvatarCharacterId, string> = {
  boy: 'DS Boy',
  girl: 'DS Girl',
  both: 'Both',
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
 * Collaboration moods (`highfive` / `handshake` / `handoff`) stem-fallback on solos;
 * Both mode prefers `public/chat-avatar/both/pair-*.gif` for high-energy popups.
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
  | 'highfive'
  | 'handshake'
  | 'handoff'

/** Pair performance clips under `public/chat-avatar/both/`. */
export type ChatDeepAvatarPairClipId =
  | 'idle'
  | 'highfive'
  | 'handshake'
  | 'handoff'
  | 'celebrate'
  | 'think'
  | 'wave'

export const CHAT_DEEP_AVATAR_PAIR_CLIPS: readonly ChatDeepAvatarPairClipId[] = [
  'idle',
  'highfive',
  'handshake',
  'handoff',
  'celebrate',
  'think',
  'wave',
] as const

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

/** Public asset folder per solo character (`apps/web/public/chat-avatar/...`). */
export const CHAT_DEEP_AVATAR_DIR: Record<ChatDeepAvatarSoloId, string> = {
  boy: '/chat-avatar/boy',
  girl: '/chat-avatar/girl',
}

export const CHAT_DEEP_AVATAR_BOTH_DIR = '/chat-avatar/both'

/** Agent/Plan/Search run length that counts as a “deep finish”. */
export const CHAT_DEEP_AVATAR_DEEP_MS = 15_000

/** Ask / very short wins latch `proud` instead of celebrate. */
export const CHAT_DEEP_AVATAR_SHORT_MS = 4_000

export function isChatDeepAvatarSoloId(raw: unknown): raw is ChatDeepAvatarSoloId {
  return raw === 'boy' || raw === 'girl'
}

export function isChatDeepAvatarBothMode(character: ChatDeepAvatarCharacterId): boolean {
  return character === 'both'
}

/** Solo tiles to mount when companion is Both (always both — never Overseer-mapped). */
export function chatDeepAvatarDuoSolos(): readonly ChatDeepAvatarSoloId[] {
  return CHAT_DEEP_AVATAR_SOLOS
}

/** Primary solo for single-asset paths (intro / consent hero / VO lead) when Both. */
export function chatDeepAvatarPrimarySolo(
  character: ChatDeepAvatarCharacterId,
): ChatDeepAvatarSoloId {
  return character === 'girl' ? 'girl' : 'boy'
}

export function normalizeChatDeepAvatarCharacter(raw: unknown): ChatDeepAvatarCharacterId {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'girl' || v === 'ds-girl' || v === 'ds_girl') return 'girl'
  if (v === 'both' || v === 'duo' || v === 'pair' || v === 'boy+girl' || v === 'boy_girl') {
    return 'both'
  }
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

/** Composer bar tile vs large left stage beside the message thread. */
export type ChatDeepAvatarDockMode = 'bar' | 'stage'

export const CHAT_DEEP_AVATAR_DOCK_KEY = 'yue-deepseek-chat-avatar-dock-v1'

export const CHAT_DEEP_AVATAR_DOCK_MODES: readonly ChatDeepAvatarDockMode[] = ['bar', 'stage'] as const

export function normalizeChatDeepAvatarDockMode(raw: unknown): ChatDeepAvatarDockMode {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'stage' || v === 'left' || v === 'panel' || v === 'large') return 'stage'
  return 'bar'
}

export function readChatDeepAvatarDockMode(
  fallback: ChatDeepAvatarDockMode = 'bar',
): ChatDeepAvatarDockMode {
  try {
    const raw = localStorage.getItem(CHAT_DEEP_AVATAR_DOCK_KEY)
    if (raw == null || raw === '') return fallback
    return normalizeChatDeepAvatarDockMode(raw)
  } catch {
    return fallback
  }
}

export const CHAT_DEEP_AVATAR_DOCK_EVENT = 'yue-deepseek-chat-avatar-dock'

export function writeChatDeepAvatarDockMode(mode: ChatDeepAvatarDockMode) {
  const next = normalizeChatDeepAvatarDockMode(mode)
  try {
    localStorage.setItem(CHAT_DEEP_AVATAR_DOCK_KEY, next)
    localStorage.setItem('yue-deepseek-chat-avatar-cloud-updated-v1', new Date().toISOString())
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_DEEP_AVATAR_DOCK_EVENT, { detail: next }))
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
  highfive: 'fist',
  handshake: 'proud',
  handoff: 'celebrate',
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

/** Mood → preferred pair clip id (Both mode high-energy / collaboration). */
export function chatDeepAvatarPairClipForMood(
  mood: ChatDeepAvatarMood | string,
): ChatDeepAvatarPairClipId | null {
  const id = String(mood || '')
    .trim()
    .toLowerCase()
  if ((CHAT_DEEP_AVATAR_PAIR_CLIPS as readonly string[]).includes(id)) {
    return id as ChatDeepAvatarPairClipId
  }
  if (id === 'fist' || id === 'hype') return 'highfive'
  if (id === 'proud' || id === 'eureka' || id === 'happy') return 'celebrate'
  if (id === 'bow' || id === 'nod') return 'handshake'
  if (id === 'relieved') return 'celebrate'
  return null
}

/**
 * Shipped pair clips — updated when Higgsfield assets land under `both/`.
 * Missing clips gracefully fall back to dual solo GIFs at runtime.
 */
export const CHAT_DEEP_AVATAR_PAIR_CLIP_SHIPPED: ReadonlySet<ChatDeepAvatarPairClipId> = new Set([
  'idle',
  'highfive',
  'handshake',
  'handoff',
  'celebrate',
  'think',
  'wave',
])

export function hasChatDeepAvatarPairClip(clip: ChatDeepAvatarPairClipId): boolean {
  return CHAT_DEEP_AVATAR_PAIR_CLIP_SHIPPED.has(clip)
}

export function chatDeepAvatarPairSrc(clip: ChatDeepAvatarPairClipId): string {
  return `${CHAT_DEEP_AVATAR_BOTH_DIR}/pair-${clip}.gif`
}

/**
 * Resolve fullscreen / popup visual for Both mode.
 * Prefers pair clip when shipped; otherwise null → dual solo fallback.
 */
export function resolveChatDeepAvatarPairPlaySrc(
  mood: ChatDeepAvatarMood | string,
): string | null {
  const clip = chatDeepAvatarPairClipForMood(mood)
  if (!clip || !hasChatDeepAvatarPairClip(clip)) return null
  return chatDeepAvatarPairSrc(clip)
}

export function chatDeepAvatarMoodSrc(
  character: ChatDeepAvatarCharacterId,
  mood: ChatDeepAvatarMood,
): string {
  // Both mode soft/in-frame still uses solo GIFs (dual mount). Picker thumbs for
  // Both may request a solo stem via primary; pair popups use resolveChatDeepAvatarPairPlaySrc.
  const solo = chatDeepAvatarPrimarySolo(character)
  return `${CHAT_DEEP_AVATAR_DIR[solo]}/deep-${chatDeepAvatarMoodAssetStem(mood)}.gif`
}

export function chatDeepAvatarPosterSrc(character: ChatDeepAvatarCharacterId): string {
  if (character === 'both') {
    // Dual thumb uses CSS stacking of boy+girl busts; this path is a soft fallback.
    return `${CHAT_DEEP_AVATAR_DIR.boy}/deep-bust.png`
  }
  return `${CHAT_DEEP_AVATAR_DIR[character]}/deep-bust.png`
}

/**
 * Fullscreen companion intro MP4 under `public/chat-avatar/{id}/intro.mp4`.
 * Both mode reuses the primary (boy) intro until a dedicated duo clip ships.
 */
export function chatDeepAvatarIntroSrc(character: ChatDeepAvatarCharacterId): string | null {
  const id = chatDeepAvatarPrimarySolo(normalizeChatDeepAvatarCharacter(character))
  return `${CHAT_DEEP_AVATAR_DIR[id]}/intro.mp4`
}

/**
 * Optional still asset path (committed under public/). Intro overlay no longer
 * applies this as `video.poster` — a static hold looked like a broken load.
 */
export function chatDeepAvatarIntroPosterSrc(character: ChatDeepAvatarCharacterId): string | null {
  const id = chatDeepAvatarPrimarySolo(normalizeChatDeepAvatarCharacter(character))
  return `${CHAT_DEEP_AVATAR_DIR[id]}/intro-poster.jpg`
}

/**
 * Whether this character has a shipped fullscreen intro clip.
 * Plays on every `#/chat` mount (no once-per-character localStorage latch).
 */
export function shouldPlayChatDeepAvatarIntro(character: ChatDeepAvatarCharacterId): boolean {
  return Boolean(chatDeepAvatarIntroSrc(character))
}

/** All mood + poster paths for a solo character (smoke / preload). */
export function chatDeepAvatarAssetPaths(character: ChatDeepAvatarSoloId): string[] {
  const dir = CHAT_DEEP_AVATAR_DIR[character]
  return [...ASSET_MOODS.map((m) => `${dir}/deep-${m}.gif`), `${dir}/deep-bust.png`]
}

/** Pair clip paths under `both/` (smoke / preload). */
export function chatDeepAvatarPairAssetPaths(): string[] {
  return CHAT_DEEP_AVATAR_PAIR_CLIPS.map((c) => chatDeepAvatarPairSrc(c))
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
 * Plan→Build → `handoff` (pair clip in Both; solo stems to celebrate);
 * default `celebrate`.
 */
export function pickChatDeepAvatarOutroMood(input: ChatDeepAvatarOutroPickInput): ChatDeepAvatarMood {
  if (input.planBuild) return 'handoff'
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
    mood === 'sleepy' ||
    mood === 'highfive' ||
    mood === 'handshake' ||
    mood === 'handoff'
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
