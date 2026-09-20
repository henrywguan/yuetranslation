/**
 * Harbor Quest · fake contact shadows (no realtime shadow maps).
 *
 * Soft dark discs under feet / hulls. Shared CircleGeometry keeps draw cost
 * near-zero vs PCF shadow maps — safe for phones.
 */
import * as THREE from 'three'

const CONTACT_GEO = new THREE.CircleGeometry(1, 18)

const matCache = new Map<number, THREE.MeshBasicMaterial>()
function contactMat(opacity: number) {
  const key = Math.round(opacity * 100)
  let m = matCache.get(key)
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      color: 0x0a1218,
      transparent: true,
      opacity,
      depthWrite: false,
      fog: true,
    })
    matCache.set(key, m)
  }
  return m
}

export type HarborContactShadowOpts = {
  /** Disc radius in world units (default ~Scout foot span). */
  radius?: number
  opacity?: number
  /** Lift above ground to avoid z-fight. */
  y?: number
  /** Stretch into an oval (canoe / sit). */
  scaleX?: number
  scaleZ?: number
}

/** Soft contact blob — caller parents under Scout / boat / NPC. */
export function hqContactShadow(opts: HarborContactShadowOpts = {}): THREE.Mesh {
  const radius = opts.radius ?? 0.4
  const opacity = opts.opacity ?? 0.3
  const mesh = new THREE.Mesh(CONTACT_GEO, contactMat(opacity))
  mesh.name = 'contact-shadow'
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = opts.y ?? 0.018
  mesh.scale.set(radius * (opts.scaleX ?? 1), radius * (opts.scaleZ ?? 1), 1)
  mesh.renderOrder = -2
  mesh.frustumCulled = true
  mesh.userData.contactShadow = true
  mesh.userData.sharedContactShadowGeo = true
  return mesh
}

/** Attach once — idempotent. Returns the disc (existing or new). */
export function attachHarborContactShadow(
  parent: THREE.Object3D,
  opts: HarborContactShadowOpts = {},
): THREE.Mesh {
  const existing = parent.getObjectByName('contact-shadow')
  if (existing instanceof THREE.Mesh) return existing
  const mesh = hqContactShadow(opts)
  parent.add(mesh)
  return mesh
}
