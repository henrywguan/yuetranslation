/**
 * Harbor Quest · generic GLB prop / character import path.
 *
 * Drop files from game-asset MCP (or Higgsfield `generate_3d`) into
 * `apps/web/public/assets/harbor-quest/` then load here. Cel shading is
 * applied by default so anime meshes match the Scout cinematic look.
 *
 * game-asset MCP is not yet connected to Cloud Agents — Henry enables it in
 * Cursor → Settings → MCP. Until then, place GLBs manually or via Higgsfield.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { applyHarborCelToObject, HARBOR_CEL_SHADE_ENABLED } from './harborCelMaterial'

/** Public URL root for Harbor Quest binary assets. */
export const HARBOR_GLB_PUBLIC_ROOT = '/assets/harbor-quest'

export type HarborGlbLoadOpts = {
  /** Target height in world units (Y). Omit to keep author scale. */
  targetHeight?: number
  /** Apply anime cel materials (default: HARBOR_CEL_SHADE_ENABLED). */
  celShade?: boolean
  /** Center XZ + plant feet on y=0. */
  plantOnGround?: boolean
  name?: string
}

const cache = new Map<string, THREE.Group>()
const inflight = new Map<string, Promise<THREE.Group | null>>()

function normalizeGlb(root: THREE.Object3D, opts: HarborGlbLoadOpts): THREE.Group {
  const wrap = new THREE.Group()
  wrap.name = opts.name ?? 'harbor-glb'
  wrap.userData.harborGlb = true
  wrap.add(root.clone(true))
  wrap.updateMatrixWorld(true)

  if (opts.targetHeight != null && opts.targetHeight > 0) {
    const box = new THREE.Box3().setFromObject(wrap)
    const size = new THREE.Vector3()
    box.getSize(size)
    const h = Math.max(0.001, size.y)
    wrap.scale.setScalar(opts.targetHeight / h)
    wrap.updateMatrixWorld(true)
  }

  if (opts.plantOnGround !== false) {
    const box2 = new THREE.Box3().setFromObject(wrap)
    wrap.position.x -= (box2.min.x + box2.max.x) * 0.5
    wrap.position.z -= (box2.min.z + box2.max.z) * 0.5
    wrap.position.y -= box2.min.y
  }

  wrap.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = false
    m.receiveShadow = false
    m.userData.harborGlbMesh = true
  })

  const useCel = opts.celShade ?? HARBOR_CEL_SHADE_ENABLED
  if (useCel) applyHarborCelToObject(wrap, true)

  return wrap
}

/**
 * Load a GLB from the Harbor public assets folder (or absolute `/…` URL).
 * Cached by URL. Returns a fresh clone each call.
 */
export async function loadHarborGlb(
  src: string,
  opts: HarborGlbLoadOpts = {},
): Promise<THREE.Group | null> {
  const url = src.startsWith('/') ? src : `${HARBOR_GLB_PUBLIC_ROOT}/${src.replace(/^\.\//, '')}`
  const cacheKey = `${url}::${opts.targetHeight ?? ''}`

  const hit = cache.get(cacheKey)
  if (hit) return hit.clone(true)

  const pending = inflight.get(cacheKey)
  if (pending) {
    const g = await pending
    return g ? g.clone(true) : null
  }

  const job = (async () => {
    try {
      const loader = new GLTFLoader()
      const gltf = await loader.loadAsync(url)
      const normalized = normalizeGlb(gltf.scene, { ...opts, name: opts.name ?? url })
      cache.set(cacheKey, normalized)
      return normalized
    } catch {
      return null
    } finally {
      inflight.delete(cacheKey)
    }
  })()
  inflight.set(cacheKey, job)
  const g = await job
  return g ? g.clone(true) : null
}

/** Clear loader cache (dev hot-reload / asset swap). */
export function clearHarborGlbCache(): void {
  cache.clear()
}
