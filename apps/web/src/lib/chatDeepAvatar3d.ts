/**
 * `#/chat` 3D companion — toggle, pose persist, GLB paths, mood→clip map.
 * Runtime: imperative three.js overlay (Harbor pattern). Not a 2D puppet SDK.
 * Higgsfield sheet/bust → `public/chat-avatar/{boy,girl}/deep.glb` (SW-ignored).
 * Both mode mounts two free-floating GLBs (boy + girl) with independent poses.
 */
import {
  CHAT_DEEP_AVATAR_DIR,
  CHAT_DEEP_AVATAR_SOLOS,
  chatDeepAvatarDuoSolos,
  chatDeepAvatarPrimarySolo,
  isChatDeepAvatarBothMode,
  normalizeChatDeepAvatarCharacter,
  type ChatDeepAvatarCharacterId,
  type ChatDeepAvatarMood,
  type ChatDeepAvatarSoloId,
} from './chatDeepAvatarCharacter'
import { CHAT_DEEP_AVATAR_PREFS_CHANGED_EVENT } from './chatDeepAvatarPersona'

/** Companion settings → 3D companion on/off (GIF remains default / fallback). */
export const CHAT_DEEP_AVATAR_3D_KEY = 'yue-deepseek-chat-avatar-3d-v1'
export const CHAT_DEEP_AVATAR_3D_EVENT = 'yue-deepseek-chat-avatar-3d'

/** Per-solo free-float pose (screen-normalized within `.ds-chat`). */
export const CHAT_DEEP_AVATAR_3D_POSE_KEY = 'yue-deepseek-chat-avatar-3d-pose-v1'
export const CHAT_DEEP_AVATAR_3D_POSE_EVENT = 'yue-deepseek-chat-avatar-3d-pose'

/** Soft snap radius (CSS px) from dock origin center → home dock. */
export const CHAT_DEEP_AVATAR_3D_SNAP_PX = 72

/** Ignore tiny pointer jitter before treating as a drag (scroll/mic safe). */
export const CHAT_DEEP_AVATAR_3D_DRAG_THRESHOLD_PX = 8

/**
 * Side-by-side dock offset (CSS px) when Both + 3D: boy left of dock center,
 * girl right. Shared `.aui-avatar-dock-origin` is the midpoint.
 */
export const CHAT_DEEP_AVATAR_3D_DUO_OFFSET_PX = 40

export type ChatDeepAvatar3dPose = {
  /** 0–1 horizontal center within layout. */
  x: number
  /** 0–1 vertical center within layout. */
  y: number
  /** When true, overlay follows bar/stage dock origin (home). */
  docked: boolean
}

/** Pose map is per-solo — Both mode keeps independent boy + girl poses. */
export type ChatDeepAvatar3dPoseMap = Record<ChatDeepAvatarSoloId, ChatDeepAvatar3dPose>

const DEFAULT_POSE_BOY: ChatDeepAvatar3dPose = { x: 0.1, y: 0.82, docked: true }
const DEFAULT_POSE_GIRL: ChatDeepAvatar3dPose = { x: 0.22, y: 0.82, docked: true }

export function defaultChatDeepAvatar3dPose(
  solo: ChatDeepAvatarSoloId = 'boy',
): ChatDeepAvatar3dPose {
  return { ...(solo === 'girl' ? DEFAULT_POSE_GIRL : DEFAULT_POSE_BOY) }
}

export function defaultChatDeepAvatar3dPoseMap(): ChatDeepAvatar3dPoseMap {
  return {
    boy: defaultChatDeepAvatar3dPose('boy'),
    girl: defaultChatDeepAvatar3dPose('girl'),
  }
}

export function normalizeChatDeepAvatar3dPose(
  raw: unknown,
  solo: ChatDeepAvatarSoloId = 'boy',
): ChatDeepAvatar3dPose {
  const fallback = defaultChatDeepAvatar3dPose(solo)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback
  const obj = raw as Record<string, unknown>
  const x = Number(obj.x)
  const y = Number(obj.y)
  return {
    x: Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : fallback.x,
    y: Number.isFinite(y) ? Math.min(1, Math.max(0, y)) : fallback.y,
    docked: obj.docked === false ? false : true,
  }
}

export function normalizeChatDeepAvatar3dPoseMap(raw: unknown): ChatDeepAvatar3dPoseMap {
  const defaults = defaultChatDeepAvatar3dPoseMap()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults
  const obj = raw as Record<string, unknown>
  const out = { ...defaults }
  for (const id of CHAT_DEEP_AVATAR_SOLOS) {
    if (obj[id] != null) out[id] = normalizeChatDeepAvatar3dPose(obj[id], id)
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

/**
 * Read pose for a solo (or the primary solo when passed a character picker id).
 * Prefer passing a `ChatDeepAvatarSoloId` for Both dual overlays.
 */
export function readChatDeepAvatar3dPose(
  character: ChatDeepAvatarCharacterId | ChatDeepAvatarSoloId = 'boy',
): ChatDeepAvatar3dPose {
  const id =
    character === 'boy' || character === 'girl'
      ? character
      : chatDeepAvatarPrimarySolo(normalizeChatDeepAvatarCharacter(character))
  return readChatDeepAvatar3dPoseMap()[id]
}

export function writeChatDeepAvatar3dPose(
  character: ChatDeepAvatarCharacterId | ChatDeepAvatarSoloId,
  pose: Partial<ChatDeepAvatar3dPose>,
) {
  const id =
    character === 'boy' || character === 'girl'
      ? character
      : chatDeepAvatarPrimarySolo(normalizeChatDeepAvatarCharacter(character))
  const map = readChatDeepAvatar3dPoseMap()
  const nextPose = normalizeChatDeepAvatar3dPose({ ...map[id], ...pose }, id)
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

/** Solos to mount as independent 3D overlays for the current companion pick. */
export function chatDeepAvatar3dSolosToMount(
  character: ChatDeepAvatarCharacterId,
): readonly ChatDeepAvatarSoloId[] {
  const id = normalizeChatDeepAvatarCharacter(character)
  if (isChatDeepAvatarBothMode(id)) return chatDeepAvatarDuoSolos()
  return [chatDeepAvatarPrimarySolo(id)]
}

/** Higgsfield bake path — runtime-fetch only (never SW-precache). */
export function chatDeepAvatarGlbSrc(
  character: ChatDeepAvatarCharacterId | ChatDeepAvatarSoloId,
): string {
  const id =
    character === 'boy' || character === 'girl'
      ? character
      : chatDeepAvatarPrimarySolo(normalizeChatDeepAvatarCharacter(character))
  return `${CHAT_DEEP_AVATAR_DIR[id]}/deep.glb`
}

/** Tint for procedural stub mesh (boy jade / girl rose). */
export function chatDeepAvatar3dStubTint(
  character: ChatDeepAvatarCharacterId | ChatDeepAvatarSoloId,
): number {
  if (character === 'girl') return 0xe8a0b8
  if (character === 'boy') return 0x3ecf8e
  return normalizeChatDeepAvatarCharacter(character) === 'girl' ? 0xe8a0b8 : 0x3ecf8e
}

/**
 * Preferred AnimationMixer clip names per mood (first match wins).
 * Missing clip → idle bob / GIF path unchanged. Celebrate / pair fullscreen stay 2D.
 */
export const CHAT_DEEP_AVATAR_3D_CLIP_ALIASES: Record<ChatDeepAvatarMood, readonly string[]> = {
  idle: ['Idle', 'idle', 'Idle_02', 'Idle_03'],
  happy: ['Wave', 'Big_Wave_Hello', 'Idle', 'idle'],
  think: ['Think', 'Confused_Scratch', 'Idle', 'idle'],
  speak: ['Speak', 'Talk', 'Idle', 'idle'],
  listen: ['Listen', 'Idle', 'idle'],
  concern: ['Idle', 'idle'],
  celebrate: ['Wave', 'Big_Wave_Hello', 'Idle', 'idle'],
  proud: ['Idle', 'idle'],
  eureka: ['Wave', 'Big_Wave_Hello', 'Idle', 'idle'],
  bow: ['Bow', 'Idle', 'idle'],
  fist: ['Fist', 'Idle', 'idle'],
  wave: ['Wave', 'Big_Wave_Hello', 'Wave_One_Hand', 'Idle', 'idle'],
  nod: ['Nod', 'Idle', 'idle'],
  relieved: ['Idle', 'idle'],
  sleepy: ['Sit', 'Chair_Sit_Idle_M', 'Chair_Sit_Idle_F', 'Idle', 'idle'],
  highfive: ['Wave', 'Big_Wave_Hello', 'Idle', 'idle'],
  handshake: ['Wave', 'Idle', 'idle'],
  handoff: ['Idle', 'idle'],
}

/** Canonical clip vocabulary we try to ship in deep.glb (Meshy / Harbor names). */
export const CHAT_DEEP_AVATAR_3D_CANON_CLIPS = ['Idle', 'Sit', 'Wave', 'Think'] as const

/**
 * Resolve the best clip name for a mood from the GLB's animation list.
 * Returns null when nothing matches → caller keeps idle bob / no mixer action.
 */
export function resolveChatDeepAvatar3dClipName(
  mood: ChatDeepAvatarMood,
  availableClipNames: readonly string[],
): string | null {
  if (!availableClipNames.length) return null
  const lower = new Map(availableClipNames.map((n) => [n.toLowerCase(), n] as const))
  const aliases = CHAT_DEEP_AVATAR_3D_CLIP_ALIASES[mood] ?? CHAT_DEEP_AVATAR_3D_CLIP_ALIASES.idle
  for (const alias of aliases) {
    const key = alias.toLowerCase()
    const exact = lower.get(key)
    if (exact) return exact
    // Meshy names often look like `Armature|Idle|baselayer` — match alias as a token.
    for (const name of availableClipNames) {
      const n = name.toLowerCase()
      if (n.includes(`|${key}|`) || n.includes(`|${key}`) || n.endsWith(key) || n.includes(key)) {
        return name
      }
    }
  }
  // Soft fallback: any clip whose name contains the mood token.
  const token = String(mood).toLowerCase()
  for (const name of availableClipNames) {
    if (name.toLowerCase().includes(token)) return name
  }
  // Last resort: Idle-ish substring, else first clip.
  for (const name of availableClipNames) {
    if (name.toLowerCase().includes('idle')) return name
  }
  return availableClipNames[0] ?? null
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

/** Dock-local X offset for a solo when Both dual GLBs are side-by-side. */
export function chatDeepAvatar3dDuoDockOffsetX(solo: ChatDeepAvatarSoloId): number {
  return solo === 'girl' ? CHAT_DEEP_AVATAR_3D_DUO_OFFSET_PX : -CHAT_DEEP_AVATAR_3D_DUO_OFFSET_PX
}
