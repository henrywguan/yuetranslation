/**
 * Push / pull DeepSeek companion prefs for signed-in users.
 */
import { saveChatDeepAvatarPrefs } from './api'
import {
  applyChatDeepAvatarCloudPrefs,
  buildLocalChatDeepAvatarCloudPrefs,
  CHAT_DEEP_AVATAR_PREFS_CHANGED_EVENT,
  type ChatDeepAvatarCloudPrefs,
} from './chatDeepAvatarPersona'
import {
  readChatDeepAvatarCelebrateMode,
  readChatDeepAvatarCharacter,
  writeChatDeepAvatarCelebrateMode,
  writeChatDeepAvatarCharacter,
} from './chatDeepAvatarCharacter'
import {
  readChatDeepAvatar3dEnabled,
  writeChatDeepAvatar3dEnabled,
} from './chatDeepAvatar3d'

let pushTimer: number | null = null
let started = false

export function pullChatDeepAvatarFromEntitlement(
  cloud: ChatDeepAvatarCloudPrefs | Record<string, unknown> | null | undefined,
) {
  applyChatDeepAvatarCloudPrefs(cloud as ChatDeepAvatarCloudPrefs | null, {
    writeCharacter: writeChatDeepAvatarCharacter,
    writeCelebrateMode: writeChatDeepAvatarCelebrateMode,
    writeCompanion3d: writeChatDeepAvatar3dEnabled,
  })
}

export function schedulePushChatDeepAvatarPrefs() {
  if (typeof window === 'undefined') return
  if (pushTimer != null) window.clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => {
    pushTimer = null
    void pushChatDeepAvatarPrefsNow()
  }, 600)
}

export async function pushChatDeepAvatarPrefsNow() {
  const blob = buildLocalChatDeepAvatarCloudPrefs({
    character: readChatDeepAvatarCharacter(),
    celebrateMode: readChatDeepAvatarCelebrateMode(),
    companion3d: readChatDeepAvatar3dEnabled(),
  })
  try {
    await saveChatDeepAvatarPrefs(blob as Record<string, unknown>)
  } catch {
    /* guest / offline — local cache still works */
  }
}

/** Call once from chat shell when entitlement is available. */
export function startChatDeepAvatarCloudSync(
  cloud: ChatDeepAvatarCloudPrefs | Record<string, unknown> | null | undefined,
) {
  pullChatDeepAvatarFromEntitlement(cloud)
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener(CHAT_DEEP_AVATAR_PREFS_CHANGED_EVENT, () => {
    schedulePushChatDeepAvatarPrefs()
  })
}
