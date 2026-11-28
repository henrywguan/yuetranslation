/**
 * `#/chat` 3D companion office / house diorama — env GLB + snap points.
 * Room is authored in Higgsfield 3D Jutsu (free) with procedural furniture;
 * optional Meshy hero props live under `/chat-avatar/env/props/`.
 */

/** Runtime-fetch office shell (+ procedural furniture). SW-excluded via `*.glb`. */
export const CHAT_DEEP_AVATAR_3D_ENV_SRC = '/chat-avatar/env/office-env.glb'

/** Named empties / markers authored in the Jutsu scene (XZ floor metres). */
export type ChatDeepAvatar3dEnvSnapId =
  | 'desk'
  | 'chair'
  | 'snack'
  | 'sofa'
  | 'path_a'
  | 'path_b'
  | 'path_c'

/**
 * Floor snap points in room metres (Blender X/Y → Three.js X/Z after GLB load).
 * Match empties placed in the Jutsu build: SNAP_* / PATH_*.
 */
export const CHAT_DEEP_AVATAR_3D_ENV_SNAPS: Record<
  ChatDeepAvatar3dEnvSnapId,
  { x: number; z: number; yaw: number }
> = {
  desk: { x: -0.9, z: -0.9, yaw: 0 },
  chair: { x: -0.9, z: -0.35, yaw: Math.PI },
  snack: { x: 0.9, z: 0.4, yaw: -0.6 },
  sofa: { x: 1.0, z: -0.85, yaw: Math.PI },
  path_a: { x: -0.4, z: 0.6, yaw: 0.2 },
  path_b: { x: 0.5, z: 0.2, yaw: -0.4 },
  path_c: { x: -0.2, z: -0.2, yaw: 0.8 },
}

/** Which ambient behavior prefers which snap. */
export const CHAT_DEEP_AVATAR_3D_BEHAVIOR_SNAP: Record<
  'study' | 'work' | 'eat' | 'idle' | 'interact',
  ChatDeepAvatar3dEnvSnapId
> = {
  study: 'chair',
  work: 'chair',
  eat: 'snack',
  idle: 'sofa',
  interact: 'path_b',
}

export const CHAT_DEEP_AVATAR_3D_WALK_SNAPS: readonly ChatDeepAvatar3dEnvSnapId[] = [
  'path_a',
  'path_b',
  'path_c',
  'snack',
  'sofa',
]

/** Room bounds for clamping character feet (metres). */
export const CHAT_DEEP_AVATAR_3D_ENV_BOUNDS = {
  xMin: -1.5,
  xMax: 1.5,
  zMin: -1.35,
  zMax: 1.2,
} as const

/** Character height scale vs authored 1m Meshy rig inside a ~2.6m room. */
export const CHAT_DEEP_AVATAR_3D_ENV_CHAR_HEIGHT = 0.95

export function chatDeepAvatar3dEnvSrc(): string {
  return CHAT_DEEP_AVATAR_3D_ENV_SRC
}

export function pickChatDeepAvatar3dEnvWalkSnap(
  rng: () => number = Math.random,
): ChatDeepAvatar3dEnvSnapId {
  const list = CHAT_DEEP_AVATAR_3D_WALK_SNAPS
  return list[Math.floor(rng() * list.length) % list.length]!
}

export function clampChatDeepAvatar3dEnvPos(x: number, z: number): { x: number; z: number } {
  const b = CHAT_DEEP_AVATAR_3D_ENV_BOUNDS
  return {
    x: Math.min(b.xMax, Math.max(b.xMin, x)),
    z: Math.min(b.zMax, Math.max(b.zMin, z)),
  }
}
