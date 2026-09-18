/**
 * Remote sailor meshes + canvas nametags for Harbor Quest multiplayer.
 */
import * as THREE from 'three'
import { applyLookToProtagonist, type HarborLook } from './harborGear'
import { buildHarborProtagonist } from './harborProtagonist'
import type { HarborRemotePlayer } from './harborPresence'
import { harborShowoffAccent } from './harborShowoff'

function nametagTexture(username: string, frameId = 'tag-plain'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 256, 64)
  const accent = harborShowoffAccent(frameId)
  const r = (accent >> 16) & 0xff
  const g = (accent >> 8) & 0xff
  const b = accent & 0xff
  // Soft plate behind the name
  ctx.fillStyle = 'rgba(4, 16, 24, 0.72)'
  roundRect(ctx, 8, 12, 240, 40, 10)
  ctx.fill()
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.75)`
  ctx.lineWidth = frameId === 'tag-plain' ? 2 : 3
  ctx.stroke()
  if (frameId.includes('phoenix') || frameId.includes('fest')) {
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.35)`
    ctx.lineWidth = 5
    roundRect(ctx, 4, 8, 248, 48, 12)
    ctx.stroke()
  }
  ctx.fillStyle = '#e8f7f4'
  ctx.font = '700 22px "Noto Sans", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const label = username.length > 18 ? `${username.slice(0, 17)}…` : username
  ctx.fillText(label, 128, 34)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function simpleCanoe(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'remote-canoe'
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.18, 1.35),
    new THREE.MeshLambertMaterial({ color: 0x8a6038, flatShading: true }),
  )
  hull.position.y = 0.1
  g.add(hull)
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.06, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x6a4828, flatShading: true }),
  )
  gun.position.y = 0.2
  g.add(gun)
  return g
}

/** Build (or refresh) a clickable remote sailor group. */
export function buildRemoteSailor(player: HarborRemotePlayer): THREE.Group {
  const root = new THREE.Group()
  root.name = `remote-sailor-${player.userId}`
  root.userData.remotePlayer = true
  root.userData.remoteUserId = player.userId
  root.userData.remoteUsername = player.username
  root.userData.remoteGender = player.gender
  root.userData.remoteAppearance = player.appearance

  const body = buildHarborProtagonist({
    pose: player.mode === 'boat' ? 'seated' : 'standing',
    gender: player.gender,
    appearance: player.appearance,
  })
  body.name = 'remote-body'
  applyLookToProtagonist(body, player.look)
  // Make meshes raycastable as the remote hit target
  body.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.userData.remotePlayer = true
      o.userData.remoteUserId = player.userId
    }
  })

  if (player.mode === 'boat') {
    const boat = simpleCanoe()
    body.position.set(0, 0.22, 0)
    boat.add(body)
    root.add(boat)
  } else {
    root.add(body)
  }

  const tag = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: nametagTexture(player.username, player.nametagFrame ?? 'tag-plain'),
      transparent: true,
      depthTest: false,
      sizeAttenuation: true,
    }),
  )
  tag.name = 'remote-nametag'
  tag.userData.nametagFrame = player.nametagFrame ?? 'tag-plain'
  tag.position.set(0, player.mode === 'boat' ? 1.85 : 2.05, 0)
  tag.scale.set(1.7, 0.42, 1)
  tag.userData.remotePlayer = true
  tag.userData.remoteUserId = player.userId
  root.add(tag)

  root.position.set(player.x, 0, player.z)
  root.rotation.y = player.yaw
  root.userData.targetX = player.x
  root.userData.targetZ = player.z
  root.userData.targetYaw = player.yaw
  root.userData.remoteMode = player.mode
  root.userData.remoteLook = player.look
  root.userData.remoteGender = player.gender
  root.userData.remoteAppearance = player.appearance
  root.userData.poseSeeded = true
  return root
}

/**
 * Apply remote identity / look / mode. Pose is stored as a lerp *target*
 * (targetX / targetZ / targetYaw) — the world tick eases the mesh toward it
 * so Broadcast updates look continuous instead of teleporting.
 */
export function updateRemoteSailor(root: THREE.Group, player: HarborRemotePlayer) {
  root.userData.targetX = player.x
  root.userData.targetZ = player.z
  root.userData.targetYaw = player.yaw
  root.userData.remoteMode = player.mode
  root.userData.remoteLook = player.look

  // First sample: snap so new sailors don't ease in from the origin
  if (root.userData.poseSeeded !== true) {
    root.position.set(player.x, 0, player.z)
    root.rotation.y = player.yaw
    root.userData.poseSeeded = true
  }

  const prevUser = root.userData.remoteUsername as string | undefined
  const prevFrame = root.userData.remoteNametagFrame as string | undefined
  const nextFrame = player.nametagFrame ?? 'tag-plain'
  if (prevUser !== player.username || prevFrame !== nextFrame) {
    root.userData.remoteUsername = player.username
    root.userData.remoteNametagFrame = nextFrame
    const tag = root.getObjectByName('remote-nametag') as THREE.Sprite | undefined
    if (tag?.material instanceof THREE.SpriteMaterial && tag.material.map) {
      tag.material.map.dispose()
      tag.material.map = nametagTexture(player.username, nextFrame)
      tag.userData.nametagFrame = nextFrame
      tag.material.needsUpdate = true
    }
  }

  // Rebuild body if travel mode flipped (seated vs standing)
  const wantBoat = player.mode === 'boat'
  const hasBoat = Boolean(root.getObjectByName('remote-canoe'))
  if (wantBoat !== hasBoat) {
    const keepX = root.position.x
    const keepZ = root.position.z
    const keepYaw = root.rotation.y
    while (root.children.length) root.remove(root.children[0]!)
    const fresh = buildRemoteSailor(player)
    while (fresh.children.length) root.add(fresh.children[0]!)
    root.position.set(keepX, 0, keepZ)
    root.rotation.y = keepYaw
    root.userData.poseSeeded = true
  } else {
    const body = root.getObjectByName('remote-body')
    if (body) applyLookToProtagonist(body, player.look)
  }
}

/** High-frequency Broadcast pose — update lerp target only (no React). */
export function setRemoteSailorPoseTarget(
  root: THREE.Group,
  pose: { x: number; z: number; yaw: number; mode: 'boat' | 'foot' },
) {
  root.userData.targetX = pose.x
  root.userData.targetZ = pose.z
  root.userData.targetYaw = pose.yaw
  if (root.userData.poseSeeded !== true) {
    root.position.set(pose.x, 0, pose.z)
    root.rotation.y = pose.yaw
    root.userData.poseSeeded = true
  }
  const prevMode = root.userData.remoteMode as string | undefined
  if (prevMode && prevMode !== pose.mode) {
    const look = (root.userData.remoteLook as HarborRemotePlayer['look'] | undefined) ?? undefined
    const username =
      (root.userData.remoteUsername as string | undefined) ??
      (root.userData.remoteUserId as string | undefined) ??
      'sailor'
    if (look) {
      updateRemoteSailor(root, {
        userId: String(root.userData.remoteUserId ?? ''),
        username,
        x: pose.x,
        z: pose.z,
        yaw: pose.yaw,
        mode: pose.mode,
        look,
        gender: (root.userData.remoteGender as HarborRemotePlayer['gender']) ?? 'male',
        appearance:
          (root.userData.remoteAppearance as HarborRemotePlayer['appearance'] | undefined) ??
          ({ hairStyle: 'short', hairColor: 0, skinTone: 1 } as HarborRemotePlayer['appearance']),
        nametagFrame:
          (root.userData.remoteNametagFrame as string | undefined) ?? 'tag-plain',
        updatedAt: Date.now(),
      })
    }
  }
  root.userData.remoteMode = pose.mode
}

/** Ease mesh toward Broadcast / Presence pose targets each frame. */
export function tickRemoteSailorPose(root: THREE.Group, alpha = 0.28) {
  const tx = root.userData.targetX as number | undefined
  const tz = root.userData.targetZ as number | undefined
  const tyaw = root.userData.targetYaw as number | undefined
  if (tx == null || tz == null) return
  root.position.x += (tx - root.position.x) * alpha
  root.position.z += (tz - root.position.z) * alpha
  if (tyaw != null) {
    let dy = tyaw - root.rotation.y
    while (dy > Math.PI) dy -= Math.PI * 2
    while (dy < -Math.PI) dy += Math.PI * 2
    root.rotation.y += dy * alpha
  }
}

export function disposeRemoteSailor(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
      o.geometry?.dispose?.()
      const mat = o.material
      const mats = Array.isArray(mat) ? mat : mat ? [mat] : []
      for (const m of mats) {
        if (m instanceof THREE.SpriteMaterial && m.map) m.map.dispose()
        m.dispose?.()
      }
    }
  })
}

/** Pick remote userId from a raycast hit list (closest first). */
export function remoteUserIdFromHits(hits: THREE.Intersection[]): string | null {
  for (const hit of hits) {
    let o: THREE.Object3D | null = hit.object
    while (o) {
      if (o.userData.remotePlayer && typeof o.userData.remoteUserId === 'string') {
        return o.userData.remoteUserId
      }
      o = o.parent
    }
  }
  return null
}

/** Nametag sprite for the local sailor (same look as remotes). */
export function buildNametagSprite(username: string, frameId = 'tag-plain'): THREE.Sprite {
  const tag = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: nametagTexture(username, frameId),
      transparent: true,
      depthTest: false,
      sizeAttenuation: true,
    }),
  )
  tag.name = 'local-nametag'
  tag.userData.nametagFrame = frameId
  tag.scale.set(1.7, 0.42, 1)
  return tag
}

export function updateNametagSprite(tag: THREE.Sprite, username: string, frameId?: string) {
  if (!(tag.material instanceof THREE.SpriteMaterial)) return
  const frame =
    frameId ?? (typeof tag.userData.nametagFrame === 'string' ? tag.userData.nametagFrame : 'tag-plain')
  if (tag.material.map) tag.material.map.dispose()
  tag.material.map = nametagTexture(username, frame)
  tag.userData.nametagFrame = frame
  tag.material.needsUpdate = true
}

export function disposeNametagSprite(tag: THREE.Sprite) {
  if (tag.material instanceof THREE.SpriteMaterial) {
    tag.material.map?.dispose()
    tag.material.dispose()
  }
}


/**
 * OSRS public-chat overhead: bare outlined glyphs, no bubble / plate / tail.
 * Default fill is classic public-chat yellow; black stroke keeps it readable.
 */
const OSRS_SAY_FILL = '#ffff00'
const OSRS_SAY_STROKE = '#000000'
const OSRS_SAY_MAX_CHARS = 48
const OSRS_SAY_LINE_CHARS = 28

function wrapSayLines(text: string): string[] {
  const raw = text.length > OSRS_SAY_MAX_CHARS ? `${text.slice(0, OSRS_SAY_MAX_CHARS - 1)}…` : text
  const words = raw.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > OSRS_SAY_LINE_CHARS && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = next
    }
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 3)
}

/** 8-way hard outline — matches OSRS readable overhead better than soft stroke alone. */
const OSRS_OUTLINE_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-2, -2],
  [0, -2],
  [2, -2],
  [-2, 0],
  [2, 0],
  [-2, 2],
  [0, 2],
  [2, 2],
  [-3, 0],
  [3, 0],
  [0, -3],
  [0, 3],
]

function chatBubbleTexture(text: string): THREE.CanvasTexture {
  const lines = wrapSayLines(text.trim())
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  // Transparent canvas only — no bubble plate / border / tail.
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = '700 28px "Noto Sans", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lineH = 32
  const blockH = lines.length * lineH
  let y = (canvas.height - blockH) / 2 + lineH / 2
  const cx = canvas.width / 2
  for (const line of lines) {
    ctx.fillStyle = OSRS_SAY_STROKE
    for (const [dx, dy] of OSRS_OUTLINE_OFFSETS) {
      ctx.fillText(line, cx + dx, y + dy)
    }
    ctx.fillStyle = OSRS_SAY_FILL
    ctx.fillText(line, cx, y)
    y += lineH
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/** Overhead say sprite (API name kept for callers / smoke). */
export function buildChatBubbleSprite(text: string): THREE.Sprite {
  const lines = wrapSayLines(text.trim())
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: chatBubbleTexture(text),
      transparent: true,
      depthTest: false,
      sizeAttenuation: true,
    }),
  )
  sprite.name = 'chat-say'
  // Wider / shorter plate — text only, no bubble padding.
  const h = 0.38 + Math.max(0, lines.length - 1) * 0.28
  sprite.scale.set(2.8, h, 1)
  sprite.userData.chatBubble = true
  sprite.userData.osrsOverheadSay = true
  return sprite
}

export function disposeChatBubbleSprite(sprite: THREE.Sprite) {
  if (sprite.material instanceof THREE.SpriteMaterial) {
    sprite.material.map?.dispose()
    sprite.material.dispose()
  }
}

export type { HarborLook }
