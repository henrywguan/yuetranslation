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
 * Instance a V2 asset. Returns null if the GLB is missing (caller may keep v1).
 * Always returns a fresh clone.
 */
export async function instanceHarborV2Asset(
  id: HarborV2AssetId,
  opts: { targetHeight?: number; name?: string } = {},
): Promise<THREE.Group | null> {
  if (!HARBOR_V2_MESH_ONLY) return null
  const hit = ready.get(id)
  if (hit) {
    const clone = hit.clone(true)
    if (opts.targetHeight != null && opts.targetHeight > 0) {
      const box = new THREE.Box3().setFromObject(clone)
      const size = new THREE.Vector3()
      box.getSize(size)
      if (size.y > 0.001) clone.scale.multiplyScalar(opts.targetHeight / size.y)
    }
    if (opts.name) clone.name = opts.name
    clone.userData.harborV2Asset = id
    return clone
  }
  const g = await fetchHarborV2Asset(id)
  if (!g) return null
  const clone = g.clone(true)
  if (opts.targetHeight != null && opts.targetHeight > 0) {
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    if (size.y > 0.001) clone.scale.multiplyScalar(opts.targetHeight / size.y)
  }
  if (opts.name) clone.name = opts.name
  clone.userData.harborV2Asset = id
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
    g.position.copy(placeholder.position)
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
