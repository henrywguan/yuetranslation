/**
 * Remote sailor meshes + canvas nametags for Harbor Quest multiplayer.
 */
import * as THREE from 'three'
import { applyLookToProtagonist, type HarborLook } from './harborGear'
import { buildHarborProtagonist } from './harborProtagonist'
import type { HarborRemotePlayer } from './harborPresence'

function nametagTexture(username: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 256, 64)
  // Soft plate behind the name
  ctx.fillStyle = 'rgba(4, 16, 24, 0.72)'
  roundRect(ctx, 8, 12, 240, 40, 10)
  ctx.fill()
  ctx.strokeStyle = 'rgba(61, 207, 182, 0.55)'
  ctx.lineWidth = 2
  ctx.stroke()
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
      map: nametagTexture(player.username),
      transparent: true,
      depthTest: false,
      sizeAttenuation: true,
    }),
  )
  tag.name = 'remote-nametag'
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
  if (prevUser !== player.username) {
    root.userData.remoteUsername = player.username
    const tag = root.getObjectByName('remote-nametag') as THREE.Sprite | undefined
    if (tag?.material instanceof THREE.SpriteMaterial && tag.material.map) {
      tag.material.map.dispose()
      tag.material.map = nametagTexture(player.username)
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
export function buildNametagSprite(username: string): THREE.Sprite {
  const tag = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: nametagTexture(username),
      transparent: true,
      depthTest: false,
      sizeAttenuation: true,
    }),
  )
  tag.name = 'local-nametag'
  tag.scale.set(1.7, 0.42, 1)
  return tag
}

export function updateNametagSprite(tag: THREE.Sprite, username: string) {
  if (!(tag.material instanceof THREE.SpriteMaterial)) return
  if (tag.material.map) tag.material.map.dispose()
  tag.material.map = nametagTexture(username)
  tag.material.needsUpdate = true
}

export function disposeNametagSprite(tag: THREE.Sprite) {
  if (tag.material instanceof THREE.SpriteMaterial) {
    tag.material.map?.dispose()
    tag.material.dispose()
  }
}


/** Floating say-text above a sailor (RuneScape-style public chat). */
function chatBubbleTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 384
  canvas.height = 96
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 384, 96)
  const label = text.length > 42 ? `${text.slice(0, 41)}…` : text
  ctx.font = '600 20px "Noto Sans", system-ui, sans-serif'
  const metrics = ctx.measureText(label)
  const padX = 16
  const bw = Math.min(368, Math.max(72, metrics.width + padX * 2))
  const bh = 40
  const bx = (384 - bw) / 2
  const by = 18
  ctx.fillStyle = 'rgba(8, 18, 24, 0.82)'
  roundRect(ctx, bx, by, bw, bh, 12)
  ctx.fill()
  ctx.strokeStyle = 'rgba(232, 212, 140, 0.55)'
  ctx.lineWidth = 2
  ctx.stroke()
  // Tail
  ctx.beginPath()
  ctx.moveTo(192 - 8, by + bh)
  ctx.lineTo(192, by + bh + 12)
  ctx.lineTo(192 + 8, by + bh)
  ctx.closePath()
  ctx.fillStyle = 'rgba(8, 18, 24, 0.82)'
  ctx.fill()
  ctx.fillStyle = '#f4efe0'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 192, by + bh / 2 + 1)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

export function buildChatBubbleSprite(text: string): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: chatBubbleTexture(text),
      transparent: true,
      depthTest: false,
      sizeAttenuation: true,
    }),
  )
  sprite.name = 'chat-bubble'
  sprite.scale.set(2.4, 0.6, 1)
  sprite.userData.chatBubble = true
  return sprite
}

export function disposeChatBubbleSprite(sprite: THREE.Sprite) {
  if (sprite.material instanceof THREE.SpriteMaterial) {
    sprite.material.map?.dispose()
    sprite.material.dispose()
  }
}

export type { HarborLook }
