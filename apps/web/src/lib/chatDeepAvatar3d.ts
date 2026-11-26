/**
 * `#/chat` 3D companion chrome stub — toggle, pose persist, GLB path helpers.
 * Runtime: imperative three.js overlay (Harbor pattern). Not a 2D puppet SDK.
 * Real Higgsfield sheet→GLB bake comes later; stub uses procedural mesh
 * (or `deep.glb` when present under public/).
 */
import {
  CHAT_DEEP_AVATAR_CHARACTERS,
  CHAT_DEEP_AVATAR_DIR,
  normalizeChatDeepAvatarCharacter,
  type ChatDeepAvatarCharacterId,
} from './chatDeepAvatarCharacter'
import { CHAT_DEEP_AVATAR_PREFS_CHANGED_EVENT } from './chatDeepAvatarPersona'

/** Companion settings → 3D companion on/off (GIF remains default / fallback). */
export const CHAT_DEEP_AVATAR_3D_KEY = 'yue-deepseek-chat-avatar-3d-v1'
export const CHAT_DEEP_AVATAR_3D_EVENT = 'yue-deepseek-chat-avatar-3d'

/** Per-character free-float pose (screen-normalized within `.aui-layout`). */
export const CHAT_DEEP_AVATAR_3D_POSE_KEY = 'yue-deepseek-chat-avatar-3d-pose-v1'
export const CHAT_DEEP_AVATAR_3D_POSE_EVENT = 'yue-deepseek-chat-avatar-3d-pose'

/** Soft snap radius (CSS px) from dock origin center → home dock. */
export const CHAT_DEEP_AVATAR_3D_SNAP_PX = 72

/** Ignore tiny pointer jitter before treating as a drag (scroll/mic safe). */
export const CHAT_DEEP_AVATAR_3D_DRAG_THRESHOLD_PX = 8

export type ChatDeepAvatar3dPose = {
  /** 0–1 horizontal center within layout. */
  x: number
  /** 0–1 vertical center within layout. */
  y: number
  /** When true, overlay follows bar/stage dock origin (home). */
  docked: boolean
}

export type ChatDeepAvatar3dPoseMap = Record<ChatDeepAvatarCharacterId, ChatDeepAvatar3dPose>

const DEFAULT_POSE: ChatDeepAvatar3dPose = { x: 0.12, y: 0.82, docked: true }

export function defaultChatDeepAvatar3dPose(): ChatDeepAvatar3dPose {
  return { ...DEFAULT_POSE }
}

export function defaultChatDeepAvatar3dPoseMap(): ChatDeepAvatar3dPoseMap {
  return {
    boy: defaultChatDeepAvatar3dPose(),
    girl: defaultChatDeepAvatar3dPose(),
  }
}

export function normalizeChatDeepAvatar3dPose(raw: unknown): ChatDeepAvatar3dPose {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaultChatDeepAvatar3dPose()
  const obj = raw as Record<string, unknown>
  const x = Number(obj.x)
  const y = Number(obj.y)
  return {
    x: Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : DEFAULT_POSE.x,
    y: Number.isFinite(y) ? Math.min(1, Math.max(0, y)) : DEFAULT_POSE.y,
    docked: obj.docked === false ? false : true,
  }
}

export function normalizeChatDeepAvatar3dPoseMap(raw: unknown): ChatDeepAvatar3dPoseMap {
  const defaults = defaultChatDeepAvatar3dPoseMap()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults
  const obj = raw as Record<string, unknown>
  const out = { ...defaults }
  for (const id of CHAT_DEEP_AVATAR_CHARACTERS) {
    if (obj[id] != null) out[id] = normalizeChatDeepAvatar3dPose(obj[id])
  }
  return out
}

/** Default off — GIF path stays the everyday companion. */
export function readChatDeepAvatar3dEnabled(fallback = false): boolean {
  try {
    const raw = localStorage.getItem(CHAT_DEEP_AVATAR_3D_KEY)
    if (raw == null || raw === '') return fallback
    if (raw === '1' || raw === 'true' || raw === 'on' || raw === 'glb' || raw === '3d') return true
    if (raw === '0' || raw === 'false' || raw === 'off' || raw === 'gif') return false
    return fallback
  } catch {
    return fallback
  }
}

export function writeChatDeepAvatar3dEnabled(enabled: boolean) {
  const next = Boolean(enabled)
  try {
    localStorage.setItem(CHAT_DEEP_AVATAR_3D_KEY, next ? '1' : '0')
    localStorage.setItem('yue-deepseek-chat-avatar-cloud-updated-v1', new Date().toISOString())
  } catch {
    /* ignore quota / private mode */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_DEEP_AVATAR_3D_EVENT, { detail: next }))
    window.dispatchEvent(new CustomEvent(CHAT_DEEP_AVATAR_PREFS_CHANGED_EVENT))
  }
  return next
}

export function readChatDeepAvatar3dPoseMap(): ChatDeepAvatar3dPoseMap {
  try {
    const raw = localStorage.getItem(CHAT_DEEP_AVATAR_3D_POSE_KEY)
    if (!raw) return defaultChatDeepAvatar3dPoseMap()
    return normalizeChatDeepAvatar3dPoseMap(JSON.parse(raw))
  } catch {
    return defaultChatDeepAvatar3dPoseMap()
  }
}

export function readChatDeepAvatar3dPose(
  character: ChatDeepAvatarCharacterId = 'boy',
): ChatDeepAvatar3dPose {
  const id = normalizeChatDeepAvatarCharacter(character)
  return readChatDeepAvatar3dPoseMap()[id]
}

export function writeChatDeepAvatar3dPose(
  character: ChatDeepAvatarCharacterId,
  pose: Partial<ChatDeepAvatar3dPose>,
) {
  const id = normalizeChatDeepAvatarCharacter(character)
  const map = readChatDeepAvatar3dPoseMap()
  const nextPose = normalizeChatDeepAvatar3dPose({ ...map[id], ...pose })
  const next = { ...map, [id]: nextPose }
  try {
    localStorage.setItem(CHAT_DEEP_AVATAR_3D_POSE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_DEEP_AVATAR_3D_POSE_EVENT, { detail: next }))
  }
  return nextPose
}

/** Future Higgsfield bake path — runtime-fetch only (never SW-precache). */
export function chatDeepAvatarGlbSrc(character: ChatDeepAvatarCharacterId): string {
  const id = normalizeChatDeepAvatarCharacter(character)
  return `${CHAT_DEEP_AVATAR_DIR[id]}/deep.glb`
}

/** Tint for procedural stub mesh (boy jade / girl rose). */
export function chatDeepAvatar3dStubTint(character: ChatDeepAvatarCharacterId): number {
  return normalizeChatDeepAvatarCharacter(character) === 'girl' ? 0xe8a0b8 : 0x3ecf8e
}

/**
 * Whether a pointer target is a mic / composer control that must win over drag.
 * Used when the floating character overlaps the dictate / send cluster.
 */
export function isChatDeepAvatar3dPointerBlocked(target: EventTarget | null): boolean {
  // Duck-type `Element.closest` so Node smokes (no DOM globals) stay green.
  const el = target as { closest?: (sel: string) => unknown } | null
  if (!el || typeof el.closest !== 'function') return false
  return Boolean(
    el.closest(
      [
        '.ds-chat-dictate',
        '.aui-send',
        '.aui-composer-input',
        '.aui-composer-toolbar',
        '.aui-attach',
        '.aui-mode',
        'button',
        'a',
        'input',
        'textarea',
        'select',
        '[contenteditable="true"]',
      ].join(','),
    ) && !el.closest('.aui-deep-avatar-3d-handle'),
  )
}

/** Soft-snap: distance from free position to dock origin center (layout-local px). */
export function shouldSnapChatDeepAvatar3dHome(
  poseCenterX: number,
  poseCenterY: number,
  dockCenterX: number,
  dockCenterY: number,
  snapPx: number = CHAT_DEEP_AVATAR_3D_SNAP_PX,
): boolean {
  const dx = poseCenterX - dockCenterX
  const dy = poseCenterY - dockCenterY
  return dx * dx + dy * dy <= snapPx * snapPx
}
