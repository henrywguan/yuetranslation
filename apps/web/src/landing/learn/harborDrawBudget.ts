/**
 * Harbor draw budget — Guan dressing + voyage props.
 *
 * The island and the river used to submit every mesh every frame.
 * Ground slabs stay (their origin is the chunk center — hiding them
 * blanks the world). Flora, huts, and satellite cays toggle with the
 * sailor. Grass tufts are one InstancedMesh per tint, not a group per tuft.
 */
import * as THREE from 'three'
import { HARBOR_GRASS_LOOK, harborGrassBladeGeo, harborGrassBladeMat } from './harborGrass'
import { harborIosDrawRadius, harborPlaceCount, isHarborConstrainedGpu } from './harborIosGpu'

export type GuanCullKind = 'flora' | 'village' | 'satellite'

/** Desktop keeps a town-sized ring; iPhone uses the existing Jetsam bubble. */
export function guanCullRadii(): { flora: number; village: number; satellite: number } {
  if (isHarborConstrainedGpu()) return { flora: 11, village: 18, satellite: 20 }
  return { flora: 16, village: 28, satellite: 26 }
}

/**
 * Voyage prop ring. Ground / roads stay via `harborLodKeep`.
 * Docks use a wider ring so the next pier is already on screen.
 */
export function harborVoyageCullRadii(orbitDistance: number): {
  prop: number
  dock: number
  visit: number
} {
  if (isHarborConstrainedGpu()) {
    const prop = harborIosDrawRadius(orbitDistance)
    return { prop, dock: prop + 8, visit: prop }
  }
  return { prop: 42, dock: 64, visit: 72 }
}

/** Guan jungle / meadow scatter — one scale, then the iPhone half-count. */
export function guanScatterCount(n: number): number {
  return harborPlaceCount(Math.max(4, Math.round(n * 0.62)))
}

/** Vertex ocean. 32² was the old tax; 16² still ripples, 10² on iPhone. */
export function guanOceanSegments(): number {
  return isHarborConstrainedGpu() ? 10 : 16
}

const FLORA_NAMES = new Set([
  'guan-palm',
  'guan-banana',
  'guan-fern',
  'guan-spear-plant',
  'guan-spiky-bush',
  'guan-canopy-tree',
  'guan-pineapple',
  'guan-grass-tuft',
  'guan-tall-grass',
  'guan-herb-stalk',
  'guan-habitat-crate',
  'guan-dirt-patch',
  'guan-bush',
])

const VILLAGE_NAMES = new Set(['guan-hut', 'guan-stone-pond', 'guan-island-cairn'])

/** Mark root-level dressing. Landmarks, NPCs, paths, and the main island stay. */
export function tagGuanDrawNodes(root: THREE.Group): void {
  for (const c of root.children) {
    if (c.userData.harborCull || c.userData.guanTuftSync) continue
    if (FLORA_NAMES.has(c.name)) c.userData.harborCull = 'flora' satisfies GuanCullKind
    else if (VILLAGE_NAMES.has(c.name)) c.userData.harborCull = 'village' satisfies GuanCullKind
    else if (c.name.startsWith('guan-sat-')) c.userData.harborCull = 'satellite' satisfies GuanCullKind
  }
}

const tuftDummy = new THREE.Object3D()

export type GuanTuftBlade = {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  rx: number
  ry: number
  rz: number
  slot: 0 | 1 | 2
}

const TUFT_COLORS = [
  HARBOR_GRASS_LOOK.bladeDeep,
  HARBOR_GRASS_LOOK.blade,
  HARBOR_GRASS_LOOK.bladeLite,
] as const

/** One instanced mesh per blade tint. `count` is filled by the sailor tick. */
export function makeGuanTuftMesh(blades: readonly GuanTuftBlade[], slot: 0 | 1 | 2): THREE.InstancedMesh {
  const subset = blades.filter((b) => b.slot === slot)
  const mesh = new THREE.InstancedMesh(
    harborGrassBladeGeo(),
    harborGrassBladeMat(TUFT_COLORS[slot]),
    Math.max(1, subset.length),
  )
  mesh.name = 'guan-grass-tuft'
  mesh.userData.guanTuftSync = true
  mesh.userData.guanTuftBlades = subset
  mesh.userData.sharedGrassGeo = true
  mesh.count = 0
  mesh.frustumCulled = false
  return mesh
}

export function syncGuanTuftMesh(mesh: THREE.InstancedMesh, x: number, z: number, r2: number): void {
  const blades = (mesh.userData.guanTuftBlades as GuanTuftBlade[] | undefined) ?? []
  let n = 0
  for (const b of blades) {
    const dx = b.x - x
    const dz = b.z - z
    if (dx * dx + dz * dz > r2) continue
    tuftDummy.position.set(b.x, b.y, b.z)
    tuftDummy.rotation.set(b.rx, b.ry, b.rz)
    tuftDummy.scale.set(b.sx, b.sy, b.sz)
    tuftDummy.updateMatrix()
    mesh.setMatrixAt(n, tuftDummy.matrix)
    n++
  }
  mesh.count = n
  mesh.instanceMatrix.needsUpdate = true
  mesh.visible = n > 0
}

/**
 * Hide dressing outside the sailor ring. Hysteresis so a tuft on the
 * edge does not flicker as the canoe bobs.
 */
export function tickGuanDrawBudget(root: THREE.Group, x: number, z: number): void {
  const radii = guanCullRadii()
  const flora = radii.flora
  const village = radii.village
  const satellite = radii.satellite
  for (const c of root.children) {
    const kind = c.userData.harborCull as GuanCullKind | undefined
    if (kind === 'flora' || kind === 'village' || kind === 'satellite') {
      const r = kind === 'flora' ? flora : kind === 'village' ? village : satellite
      const ax = typeof c.userData.cullX === 'number' ? c.userData.cullX : c.position.x
      const az = typeof c.userData.cullZ === 'number' ? c.userData.cullZ : c.position.z
      const d2 = (ax - x) * (ax - x) + (az - z) * (az - z)
      const show = r * r
      const hide = (r + 3) * (r + 3)
      if (c.visible) {
        if (d2 > hide) c.visible = false
      } else if (d2 <= show) c.visible = true
    }
    if (c.userData.guanTuftSync && c instanceof THREE.InstancedMesh) {
      syncGuanTuftMesh(c, x, z, flora * flora)
    }
  }
}

/** Visible meshes + triangle estimate (instanced blades multiply). */
export function harborMeshLoad(root: THREE.Object3D): { meshes: number; tris: number } {
  let meshes = 0
  let tris = 0
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    let p: THREE.Object3D | null = o
    while (p) {
      if (!p.visible) return
      p = p.parent
    }
    const g = o.geometry
    const pos = g.getAttribute('position')
    const base = g.index ? g.index.count / 3 : pos ? pos.count / 3 : 0
    if (o instanceof THREE.InstancedMesh) {
      if (o.count <= 0) return
      meshes += 1
      tris += base * o.count
      return
    }
    meshes += 1
    tris += base
  })
  return { meshes, tris: Math.round(tris) }
}
