/**
 * `#/chat` 3D companion office / house diorama — env GLB + snap points + Meshy props.
 * Room shell from Higgsfield 3D Jutsu; hero furniture from Meshy image→3D, locally
 * compressed (simplify + 256px WebP) so the whole props set is ~5 MiB.
 */

/** Runtime-fetch office shell (walls/floor/windows + procedural stand-ins). */
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

/**
 * Compressed Meshy hero props. Soft budget: keep the whole set under ~6 MiB.
 * `hidePrefixes` removes matching procedural stand-ins from `office-env.glb`.
 */
export type ChatDeepAvatar3dEnvProp = {
  id: string
  src: string
  /** Floor position (metres). */
  x: number
  z: number
  yaw: number
  /** Target world height (metres) after normalize-to-ground. */
  height: number
  /** Name prefixes on procedural meshes to hide once this prop loads. */
  hidePrefixes: readonly string[]
}

export const CHAT_DEEP_AVATAR_3D_ENV_PROPS: readonly ChatDeepAvatar3dEnvProp[] = [
  {
    id: 'desk',
    src: '/chat-avatar/env/props/desk.glb',
    x: -0.9,
    z: -0.95,
    yaw: 0,
    height: 0.78,
    hidePrefixes: ['PRP_desk_', 'PRP_monitor_', 'PRP_keyboard'],
  },
  {
    id: 'chair',
    src: '/chat-avatar/env/props/chair.glb',
    x: -0.9,
    z: -0.32,
    yaw: Math.PI,
    height: 1.05,
    hidePrefixes: ['PRP_chair_'],
  },
  {
    id: 'lamp',
    src: '/chat-avatar/env/props/lamp.glb',
    x: -1.45,
    z: 0.2,
    yaw: 0.3,
    height: 1.55,
    hidePrefixes: ['PRP_lamp_'],
  },
  {
    id: 'bookshelf',
    src: '/chat-avatar/env/props/bookshelf.glb',
    x: 1.25,
    z: -1.35,
    yaw: Math.PI,
    height: 1.65,
    hidePrefixes: ['PRP_shelf_', 'PRP_book_'],
  },
  {
    id: 'plant',
    src: '/chat-avatar/env/props/plant.glb',
    x: -1.4,
    z: -1.2,
    yaw: 0.4,
    height: 0.85,
    hidePrefixes: ['PRP_plant_', 'PRP_leaf_'],
  },
  {
    id: 'rug',
    src: '/chat-avatar/env/props/rug.glb',
    x: 0.15,
    z: 0.15,
    yaw: 0.15,
    height: 0.04,
    hidePrefixes: ['ENV_rug'],
  },
  {
    id: 'sofa',
    src: '/chat-avatar/env/props/sofa.glb',
    x: 1.05,
    z: -0.7,
    yaw: Math.PI,
    height: 0.85,
    hidePrefixes: ['PRP_sofa_'],
  },
  {
    id: 'side-table',
    src: '/chat-avatar/env/props/side-table.glb',
    x: 0.85,
    z: 0.35,
    yaw: 0.2,
    height: 0.45,
    hidePrefixes: ['PRP_side_'],
  },
  {
    id: 'snack',
    src: '/chat-avatar/env/props/snack.glb',
    x: 0.88,
    z: 0.38,
    yaw: -0.4,
    height: 0.12,
    hidePrefixes: ['PRP_plate', 'PRP_mug'],
  },
  {
    id: 'wall-art',
    src: '/chat-avatar/env/props/wall-art.glb',
    x: -0.2,
    z: -1.52,
    yaw: 0,
    height: 0.55,
    hidePrefixes: ['PRP_art_'],
  },
]

/** Soft ceiling for the whole props folder (bytes) — keep mobile downloads sane. */
export const CHAT_DEEP_AVATAR_3D_ENV_PROPS_MAX_BYTES = 6 * 1024 * 1024

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
