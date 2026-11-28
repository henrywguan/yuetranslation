/**
 * `#/chat` 3D companion idle AI — wander / study / work / interact.
 * Pure helpers + shared position bus so Both can collaborate when near.
 * Play-bus moods still override briefly in the overlay (not here).
 */
import type { ChatDeepAvatarSoloId } from './chatDeepAvatarCharacter'

/** Ambient behaviors when play-bus mood is idle / resting. */
export type ChatDeepAvatar3dBehavior =
  | 'idle'
  | 'walk'
  | 'study'
  | 'work'
  | 'interact'
  | 'eat'
  | 'deskNap'

/** Canonical clip names we bake into deep.glb for ambient AI. */
export const CHAT_DEEP_AVATAR_3D_BEHAVIOR_CLIPS = [
  'Idle',
  'Walk',
  'Interact',
  'Study',
  'Work',
  'Eat',
  'DeskNap',
] as const

export type ChatDeepAvatar3dBehaviorClip = (typeof CHAT_DEEP_AVATAR_3D_BEHAVIOR_CLIPS)[number]

/** AnimationMixer aliases per ambient behavior (first match wins). */
export const CHAT_DEEP_AVATAR_3D_BEHAVIOR_ALIASES: Record<
  ChatDeepAvatar3dBehavior,
  readonly string[]
> = {
  idle: ['Idle', 'idle', 'Idle_02', 'Idle_03', 'Sit', 'Chair_Sit_Idle_M', 'Chair_Sit_Idle_F'],
  walk: ['Walk', 'Casual_Walk_inplace', 'Casual_Walk', 'TextingWalk', 'Texting_Walk', 'Walking_A', 'Idle'],
  interact: ['Interact', 'Stand_and_Chat', 'Talk_with_Hands_Open', 'Agree_Gesture', 'Wave', 'Idle'],
  study: ['Study', 'Sitting_Answering_Questions', 'Sit', 'Chair_Sit_Idle_M', 'Chair_Sit_Idle_F', 'Think', 'Idle'],
  work: ['Work', 'Phone_Conversation', 'Phone_Call_Gesture', 'Texting_Walk_inplace', 'Idle'],
  eat: ['Eat', 'Sit_and_Drink', 'Stand_and_Drink', 'Sit', 'Idle'],
  deskNap: ['DeskNap', 'Sleep_on_Desk', 'Sit_and_Doze_Off', 'Sit', 'Sleepy', 'Idle'],
}

/** Moods that briefly pause ambient AI (play-bus / FSM overrides). */
export const CHAT_DEEP_AVATAR_3D_MOOD_OVERRIDE_MS = 4200

/**
 * Soft / resting moods keep ambient AI running. Active show moods pause it.
 * `idle` / `think` (composer draft) / `sleepy` still allow wander between beats.
 */
export function chatDeepAvatar3dMoodOverridesAmbient(
  mood: string,
): boolean {
  const m = String(mood || 'idle').toLowerCase()
  if (m === 'idle' || m === 'think' || m === 'sleepy' || m === 'relieved') return false
  return true
}

/** Normalized screen margins so companions stay on-chrome (not under notch / dock). */
export const CHAT_DEEP_AVATAR_3D_WANDER_MARGIN = {
  xMin: 0.08,
  xMax: 0.92,
  yMin: 0.18,
  yMax: 0.78,
} as const

/** How close (normalized layout space) counts as "near" for Both interact. */
export const CHAT_DEEP_AVATAR_3D_NEAR_DIST = 0.14

/** Walk speed in normalized layout units per second. */
export const CHAT_DEEP_AVATAR_3D_WALK_SPEED = 0.055

/** Dwell ranges (ms) after arriving at a spot. */
export const CHAT_DEEP_AVATAR_3D_DWELL_MS = {
  idle: [2800, 5200],
  study: [5200, 9000],
  work: [4800, 8500],
  interact: [4200, 7800],
  eat: [4800, 8200],
  deskNap: [5500, 9500],
} as const

type Rng = () => number

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function randRange(rng: Rng, lo: number, hi: number): number {
  return lo + (hi - lo) * rng()
}

export function pickChatDeepAvatar3dWanderTarget(
  rng: Rng = Math.random,
  margin = CHAT_DEEP_AVATAR_3D_WANDER_MARGIN,
): { x: number; y: number } {
  return {
    x: randRange(rng, margin.xMin, margin.xMax),
    y: randRange(rng, margin.yMin, margin.yMax),
  }
}

export function chatDeepAvatar3dPoseDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export function chatDeepAvatar3dCompanionsNear(
  a: { x: number; y: number },
  b: { x: number; y: number },
  threshold = CHAT_DEEP_AVATAR_3D_NEAR_DIST,
): boolean {
  return chatDeepAvatar3dPoseDistance(a, b) <= threshold
}

/**
 * Step toward a wander target. Returns arrived=true when within epsilon.
 */
export function stepChatDeepAvatar3dWalk(
  pos: { x: number; y: number },
  target: { x: number; y: number },
  dtSec: number,
  speed = CHAT_DEEP_AVATAR_3D_WALK_SPEED,
): { x: number; y: number; arrived: boolean } {
  const dx = target.x - pos.x
  const dy = target.y - pos.y
  const dist = Math.hypot(dx, dy)
  const step = Math.max(0, speed) * Math.max(0, dtSec)
  if (dist <= 0.012 || step >= dist) {
    return { x: clamp01(target.x), y: clamp01(target.y), arrived: true }
  }
  const t = step / dist
  return {
    x: clamp01(pos.x + dx * t),
    y: clamp01(pos.y + dy * t),
    arrived: false,
  }
}

/**
 * Pick next ambient behavior. When `preferInteract`, bias hard toward Interact
 * (Both mode when companions are near).
 */
export function pickChatDeepAvatar3dBehavior(
  rng: Rng = Math.random,
  opts: { preferInteract?: boolean } = {},
): ChatDeepAvatar3dBehavior {
  if (opts.preferInteract) {
    // ~70% interact when near partner; else light walk/study/work/idle.
    const roll = rng()
    if (roll < 0.7) return 'interact'
    if (roll < 0.82) return 'walk'
    if (roll < 0.9) return 'study'
    if (roll < 0.96) return 'work'
    return 'idle'
  }
  const roll = rng()
  // Default solo mix: walk, desk work/study, snack, nap, idle.
  if (roll < 0.28) return 'walk'
  if (roll < 0.44) return 'study'
  if (roll < 0.58) return 'work'
  if (roll < 0.7) return 'eat'
  if (roll < 0.8) return 'deskNap'
  if (roll < 0.9) return 'idle'
  return 'walk'
}

export function pickChatDeepAvatar3dDwellMs(
  behavior: ChatDeepAvatar3dBehavior,
  rng: Rng = Math.random,
): number {
  if (behavior === 'walk') return 0
  const range =
    behavior === 'study'
      ? CHAT_DEEP_AVATAR_3D_DWELL_MS.study
      : behavior === 'work'
        ? CHAT_DEEP_AVATAR_3D_DWELL_MS.work
        : behavior === 'interact'
          ? CHAT_DEEP_AVATAR_3D_DWELL_MS.interact
          : behavior === 'eat'
            ? CHAT_DEEP_AVATAR_3D_DWELL_MS.eat
            : behavior === 'deskNap'
              ? CHAT_DEEP_AVATAR_3D_DWELL_MS.deskNap
              : CHAT_DEEP_AVATAR_3D_DWELL_MS.idle
  return Math.round(randRange(rng, range[0], range[1]))
}

/** Resolve best GLB clip name for an ambient behavior. */
export function resolveChatDeepAvatar3dBehaviorClipName(
  behavior: ChatDeepAvatar3dBehavior,
  availableClipNames: readonly string[],
): string | null {
  if (!availableClipNames.length) return null
  const lower = new Map(availableClipNames.map((n) => [n.toLowerCase(), n] as const))
  const aliases = CHAT_DEEP_AVATAR_3D_BEHAVIOR_ALIASES[behavior]
  for (const alias of aliases) {
    const key = alias.toLowerCase()
    const exact = lower.get(key)
    if (exact) return exact
    for (const name of availableClipNames) {
      const n = name.toLowerCase()
      if (n.includes(`|${key}|`) || n.includes(`|${key}`) || n.endsWith(key) || n.includes(key)) {
        return name
      }
    }
  }
  for (const name of availableClipNames) {
    if (name.toLowerCase().includes('idle')) return name
  }
  return availableClipNames[0] ?? null
}

/** Shared live poses so dual Both overlays can sense proximity. */
const livePos = new Map<ChatDeepAvatarSoloId, { x: number; y: number }>()

export function publishChatDeepAvatar3dLivePose(
  solo: ChatDeepAvatarSoloId,
  pose: { x: number; y: number } | null,
) {
  if (!pose) livePos.delete(solo)
  else livePos.set(solo, { x: pose.x, y: pose.y })
}

export function readChatDeepAvatar3dPartnerPose(
  solo: ChatDeepAvatarSoloId,
): { x: number; y: number } | null {
  const other: ChatDeepAvatarSoloId = solo === 'boy' ? 'girl' : 'boy'
  return livePos.get(other) ?? null
}

export function clearChatDeepAvatar3dLivePoses() {
  livePos.clear()
}
