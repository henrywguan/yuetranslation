/**
 * Harbor Quest · V2 mesh-only asset catalog.
 *
 * Live look = authored GLBs. Procedural hqBox craft is v1 archive.
 * See docs/harbor-quest/V2-MESH-WORLD.md
 */
import * as THREE from 'three'
import { loadHarborGlb } from './harborGlbAssets'

/** Master switch — when true, river prefers GLB kits over hqBox craft. */
export const HARBOR_V2_MESH_ONLY = true

export const HARBOR_V2_PUBLIC_ROOT = '/assets/harbor-quest/v2'

export type HarborV2AssetId =
  | 'canoe'
  | 'pier-module'
  | 'house-village'
  | 'lantern-paper'
  | 'stall-market'
  | 'save-shack'
  | 'outfitter'
  | 'willow'
  | 'bridge-arch'

export type HarborV2AssetDef = {
  id: HarborV2AssetId
  /** Path under public /assets/harbor-quest/ */
  src: string
  /** Default plant height (Y) when instancing. */
  targetHeight: number
  /** Human label for docs / smokes. */
  label: string
}

/** Core kit that tiles the river rebirth. Expand catalog in later waves. */
export const HARBOR_V2_ASSETS: Record<HarborV2AssetId, HarborV2AssetDef> = {
  canoe: {
    id: 'canoe',
    src: 'v2/canoe.glb',
    targetHeight: 0.55,
    label: 'River pine canoe',
  },
  'pier-module': {
    id: 'pier-module',
    src: 'v2/pier-module.glb',
    targetHeight: 0.9,
    label: 'Modular pier deck',
  },
  'house-village': {
    id: 'house-village',
    src: 'v2/house-village.glb',
    targetHeight: 2.4,
    label: 'Village hip-roof house',
  },
  'lantern-paper': {
    id: 'lantern-paper',
    src: 'v2/lantern-paper.glb',
    targetHeight: 0.35,
    label: 'Paper lantern',
  },
  'stall-market': {
    id: 'stall-market',
    src: 'v2/stall-market.glb',
    targetHeight: 1.6,
    label: 'Market stall',
  },
  'save-shack': {
    id: 'save-shack',
    src: 'v2/save-shack.glb',
    targetHeight: 2.8,
    label: 'Save Shack vault',
  },
  outfitter: {
    id: 'outfitter',
    src: 'v2/outfitter.glb',
    targetHeight: 2.6,
    label: 'River Outfitter shop',
  },
  willow: {
    id: 'willow',
    src: 'v2/willow.glb',
    targetHeight: 3.2,
    label: 'Weeping willow',
  },
  'bridge-arch': {
    id: 'bridge-arch',
    src: 'v2/bridge-arch.glb',
    targetHeight: 1.8,
    label: 'Stone arch bridge',
  },
}

const ready = new Map<HarborV2AssetId, THREE.Group | null>()
const inflight = new Map<HarborV2AssetId, Promise<THREE.Group | null>>()

/** Preload the core river kit (call after learn mount / first gesture). */
export function preloadHarborV2Assets(): void {
  if (!HARBOR_V2_MESH_ONLY) return
  if (typeof window === 'undefined') return
  for (const id of Object.keys(HARBOR_V2_ASSETS) as HarborV2AssetId[]) {
    void fetchHarborV2Asset(id)
  }
}

async function fetchHarborV2Asset(id: HarborV2AssetId): Promise<THREE.Group | null> {
  if (ready.has(id)) return ready.get(id) ?? null
  const pending = inflight.get(id)
  if (pending) return pending
  const def = HARBOR_V2_ASSETS[id]
  const job = (async () => {
    const g = await loadHarborGlb(def.src, {
      targetHeight: def.targetHeight,
      plantOnGround: true,
      name: `harbor-v2-${id}`,
      celShade: true,
    })
    ready.set(id, g)
    inflight.delete(id)
    return g
  })()
  inflight.set(id, job)
  return job
}

/**
 * After a uniform height rescale, re-center XZ and plant feet on local y=0.
 * Authored GLBs are origin-centered — scaling without re-planting buries them.
 */
export function rescaleAndReplantHarborV2Clone(
  clone: THREE.Group,
  targetHeight: number,
): void {
  if (!(targetHeight > 0)) return
  // Drop prior plant offset so scale is measured from the raw mesh frame.
  clone.position.set(0, 0, 0)
  clone.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(clone)
  const size = new THREE.Vector3()
  box.getSize(size)
  if (!(size.y > 0.001)) return
  clone.scale.multiplyScalar(targetHeight / size.y)
  clone.updateMatrixWorld(true)
  const box2 = new THREE.Box3().setFromObject(clone)
  clone.position.x -= (box2.min.x + box2.max.x) * 0.5
  clone.position.z -= (box2.min.z + box2.max.z) * 0.5
  clone.position.y -= box2.min.y
}

/**
 * Instance a V2 asset. Returns null if the GLB is missing (caller may keep v1).
 * Always returns a fresh clone with feet planted on local y=0.
 */
export async function instanceHarborV2Asset(
  id: HarborV2AssetId,
  opts: { targetHeight?: number; name?: string } = {},
): Promise<THREE.Group | null> {
  if (!HARBOR_V2_MESH_ONLY) return null
  const base = ready.get(id) ?? (await fetchHarborV2Asset(id))
  if (!base) return null
  const clone = base.clone(true)
  if (opts.targetHeight != null && opts.targetHeight > 0) {
    rescaleAndReplantHarborV2Clone(clone, opts.targetHeight)
  }
  if (opts.name) clone.name = opts.name
  clone.userData.harborV2Asset = id
  clone.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) m.userData.harborV2SharedGeo = true
  })
  return clone
}

/** Sync helper — use when a parent must build immediately; swaps in when ready. */
export function mountHarborV2Asset(
  parent: THREE.Object3D,
  id: HarborV2AssetId,
  opts: {
    targetHeight?: number
    name?: string
    position?: [number, number, number]
    rotationY?: number
    onReady?: (g: THREE.Group) => void
  } = {},
): THREE.Group {
  const placeholder = new THREE.Group()
  placeholder.name = opts.name ?? `harbor-v2-${id}-pending`
  placeholder.userData.harborV2Pending = id
  if (opts.position) placeholder.position.set(...opts.position)
  if (opts.rotationY != null) placeholder.rotation.y = opts.rotationY
  parent.add(placeholder)

  void instanceHarborV2Asset(id, { targetHeight: opts.targetHeight, name: opts.name }).then((g) => {
    if (!g) return
    // Compose mount pose with the clone's plant offset — never overwrite plant Y
    // (that buried origin-centered houses so only roofs poked through the dirt).
    const plantX = g.position.x
    const plantY = g.position.y
    const plantZ = g.position.z
    g.position.set(
      placeholder.position.x + plantX,
      placeholder.position.y + plantY,
      placeholder.position.z + plantZ,
    )
    g.rotation.copy(placeholder.rotation)
    g.userData.harborV2Asset = id
    placeholder.parent?.add(g)
    placeholder.removeFromParent()
    opts.onReady?.(g)
  })
  return placeholder
}

export function isHarborV2AssetReady(id: HarborV2AssetId): boolean {
  return Boolean(ready.get(id))
}

/** True when chunk/voyage dispose must not free this GPU buffer (shared GLB / grass). */
export function isHarborSharedGpuMesh(o: THREE.Object3D): boolean {
  const m = o as THREE.Mesh
  if (!m.isMesh) return false
  return Boolean(
    m.userData.sharedGrassGeo ||
      m.userData.harborGlbMesh ||
      m.userData.harborV2SharedGeo ||
      m.userData.scoutGlbMesh,
  )
}

const tintMatCache = new Map<string, THREE.Material>()

/** Recolor a V2 instance toward a landmark palette (shared tinted materials). */
export function tintHarborV2Asset(root: THREE.Object3D, hex: number, amount = 0.42): void {
  const target = new THREE.Color(hex)
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const apply = (mat: THREE.Material): THREE.Material => {
      const key = `${mat.uuid}:${hex.toString(16)}:${amount.toFixed(2)}`
      const hit = tintMatCache.get(key)
      if (hit) return hit
      const next = mat.clone()
      if ('color' in next && next.color instanceof THREE.Color) {
        next.color.lerp(target, amount)
      }
      tintMatCache.set(key, next)
      return next
    }
    m.material = Array.isArray(m.material) ? m.material.map(apply) : apply(m.material)
  })
}

const v2Maps = new Map<string, THREE.Texture>()

/** Authored seamless bank / path maps — swap onto Lambert after load. */
export const HARBOR_V2_TEX = {
  grass: '/assets/harbor-quest/v2/tex-grass.png',
  dirt: '/assets/harbor-quest/v2/tex-dirt.png',
} as const

/** Paint a repeating V2 albedo onto an existing Lambert (keeps fallback until load). */
export function applyHarborV2Map(
  material: THREE.MeshLambertMaterial,
  kind: keyof typeof HARBOR_V2_TEX,
  repeat = 2.6,
): void {
  if (!HARBOR_V2_MESH_ONLY) return
  if (typeof window === 'undefined') return
  const url = HARBOR_V2_TEX[kind]
  const hit = v2Maps.get(url)
  if (hit) {
    material.map = hit
    material.needsUpdate = true
    return
  }
  const loader = new THREE.TextureLoader()
  loader.load(url, (tex) => {
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeat, repeat)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.needsUpdate = true
    v2Maps.set(url, tex)
    material.map = tex
    material.needsUpdate = true
  })
}
