/**
 * `#/chat` companion character pick — DS Boy / DS Girl.
 * Device-local preference (same pattern as composer prefs).
 */

export type ChatDeepAvatarCharacterId = 'boy' | 'girl'

export const CHAT_DEEP_AVATAR_CHARACTER_KEY = 'yue-deepseek-chat-avatar-character-v1'

export const CHAT_DEEP_AVATAR_CHARACTERS: readonly ChatDeepAvatarCharacterId[] = [
  'boy',
  'girl',
] as const

export const CHAT_DEEP_AVATAR_CHARACTER_LABEL: Record<ChatDeepAvatarCharacterId, string> = {
  boy: 'DS Boy',
  girl: 'DS Girl',
}

export type ChatDeepAvatarMood =
  | 'idle'
  | 'happy'
  | 'think'
  | 'speak'
  | 'listen'
  | 'concern'
  | 'celebrate'

const MOODS: readonly ChatDeepAvatarMood[] = [
  'idle',
  'happy',
  'think',
  'speak',
  'listen',
  'concern',
  'celebrate',
] as const

/** Public asset folder per character (`apps/web/public/chat-avatar/...`). */
export const CHAT_DEEP_AVATAR_DIR: Record<ChatDeepAvatarCharacterId, string> = {
  boy: '/chat-avatar/boy',
  girl: '/chat-avatar/girl',
}

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

export function writeChatDeepAvatarCharacter(id: ChatDeepAvatarCharacterId) {
  try {
    localStorage.setItem(CHAT_DEEP_AVATAR_CHARACTER_KEY, normalizeChatDeepAvatarCharacter(id))
  } catch {
    /* ignore quota / private mode */
  }
}

export function chatDeepAvatarMoodSrc(
  character: ChatDeepAvatarCharacterId,
  mood: ChatDeepAvatarMood,
): string {
  return `${CHAT_DEEP_AVATAR_DIR[character]}/deep-${mood}.gif`
}

export function chatDeepAvatarPosterSrc(character: ChatDeepAvatarCharacterId): string {
  return `${CHAT_DEEP_AVATAR_DIR[character]}/deep-bust.png`
}

/** All mood + poster paths for a character (smoke / preload). */
export function chatDeepAvatarAssetPaths(character: ChatDeepAvatarCharacterId): string[] {
  const dir = CHAT_DEEP_AVATAR_DIR[character]
  return [...MOODS.map((m) => `${dir}/deep-${m}.gif`), `${dir}/deep-bust.png`]
}

export { MOODS as CHAT_DEEP_AVATAR_MOODS }
