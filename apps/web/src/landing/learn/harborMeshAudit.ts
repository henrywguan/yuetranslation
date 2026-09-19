/**
 * Harbor Quest · Phase 3 geometry audit (anime / Wuxia cel readability).
 *
 * Weighted vertex normals so the Harbor cel-shader draws a clean terminator
 * across clothing, lantern paper, and terrain — not jagged hard-edge bands.
 * Micro-geometry above a silhouette budget is welded / simplified.
 */
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js'

export type HarborMeshKind = 'character' | 'clothing' | 'lantern' | 'terrain' | 'item' | 'architecture'

export type HarborMeshBudget = {
  /** Soft triangle cap — simplify only when well over this. */
  maxTris: number
  weld: boolean
  /** Angle-weighted smooth normals (cel shadow lines). */
  smooth: boolean
  simplify: boolean
}

export const HARBOR_MESH_BUDGET: Record<HarborMeshKind, HarborMeshBudget> = {
  character: { maxTris: 2500, weld: true, smooth: true, simplify: false },
  clothing: { maxTris: 800, weld: true, smooth: true, simplify: true },
  lantern: { maxTris: 220, weld: true, smooth: true, simplify: false },
  terrain: { maxTris: 400, weld: true, smooth: true, simplify: true },
  item: { maxTris: 300, weld: true, smooth: true, simplify: true },
  architecture: { maxTris: 400, weld: false, smooth: false, simplify: false },
}

export function countHarborTriangles(geometry: THREE.BufferGeometry): number {
  if (geometry.index) return Math.floor(geometry.index.count / 3)
  const pos = geometry.getAttribute('position')
  return pos ? Math.floor(pos.count / 3) : 0
}

/**
 * Position-only weld (ignores UV / existing normals) so cube corners share a
 * vertex and the cel terminator can run around the silhouette.
 */
export function weldHarborPositions(geometry: THREE.BufferGeometry, epsilon = 1e-4): THREE.BufferGeometry {
  const pos = geometry.getAttribute('position')
  if (!pos || pos.count < 3) return geometry
  const uv = geometry.getAttribute('uv')
  const index = geometry.getIndex()
  const srcCount = index ? index.count : pos.count
  const quant = 1 / Math.max(epsilon, 1e-8)
  const hash = new Map<string, number>()
  const newPos: number[] = []
  const newUv: number[] = []
  const newIndex: number[] = []
  for (let i = 0; i < srcCount; i++) {
    const vi = index ? index.getX(i) : i
    const x = pos.getX(vi)
    const y = pos.getY(vi)
    const z = pos.getZ(vi)
    const key = `${Math.round(x * quant)}:${Math.round(y * quant)}:${Math.round(z * quant)}`
    let ni = hash.get(key)
    if (ni === undefined) {
      ni = newPos.length / 3
      hash.set(key, ni)
      newPos.push(x, y, z)
      if (uv) newUv.push(uv.getX(vi), uv.getY(vi))
    }
    newIndex.push(ni)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3))
  if (uv && newUv.length === (newPos.length / 3) * 2) {
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(newUv, 2))
  }
  geo.setIndex(newIndex)
  return geo
}

/**
 * Weld coincident verts, then write angle×area-weighted normals.
 * Shared corners average adjacent faces so cel ramps stay a single stroke.
 */
export function applyWeightedNormals(geometry: THREE.BufferGeometry, weldEpsilon = 1e-4): THREE.BufferGeometry {
  const welded = weldHarborPositions(geometry, weldEpsilon)
  const pos = welded.getAttribute('position')
  if (!pos || pos.count < 3) return welded
  if (!welded.index) welded.setIndex([...Array(pos.count).keys()])
  const idx = welded.index!
  const acc = new Float32Array(pos.count * 3)

  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const ab = new THREE.Vector3()
  const ac = new THREE.Vector3()
  const ba = new THREE.Vector3()
  const bc = new THREE.Vector3()
  const ca = new THREE.Vector3()
  const cb = new THREE.Vector3()
  const fn = new THREE.Vector3()

  const add = (i: number, w: number) => {
    acc[i * 3] += fn.x * w
    acc[i * 3 + 1] += fn.y * w
    acc[i * 3 + 2] += fn.z * w
  }

  for (let t = 0; t < idx.count; t += 3) {
    const ia = idx.getX(t)
    const ib = idx.getX(t + 1)
    const ic = idx.getX(t + 2)
    a.fromBufferAttribute(pos, ia)
    b.fromBufferAttribute(pos, ib)
    c.fromBufferAttribute(pos, ic)
    ab.subVectors(b, a)
    ac.subVectors(c, a)
    fn.crossVectors(ab, ac)
    const area2 = fn.length()
    if (area2 < 1e-14) continue
    fn.multiplyScalar(1 / area2)

    ba.subVectors(a, b)
    bc.subVectors(c, b)
    ca.subVectors(a, c)
    cb.subVectors(b, c)
    const lab = ab.length()
    const lac = ac.length()
    const lbc = bc.length()
    const angA = Math.acos(THREE.MathUtils.clamp(ab.dot(ac) / Math.max(lab * lac, 1e-12), -1, 1))
    const angB = Math.acos(THREE.MathUtils.clamp(ba.dot(bc) / Math.max(lab * lbc, 1e-12), -1, 1))
    const angC = Math.acos(THREE.MathUtils.clamp(ca.dot(cb) / Math.max(lac * lbc, 1e-12), -1, 1))
    add(ia, angA * area2)
    add(ib, angB * area2)
    add(ic, angC * area2)
  }

  const normals = new Float32Array(pos.count * 3)
  const n = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    n.set(acc[i * 3], acc[i * 3 + 1], acc[i * 3 + 2])
    if (n.lengthSq() < 1e-14) n.set(0, 1, 0)
    else n.normalize()
    normals[i * 3] = n.x
    normals[i * 3 + 1] = n.y
    normals[i * 3 + 2] = n.z
  }
  welded.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  welded.normalizeNormals()
  return welded
}

/** Drop leftover micro-triangles so silhouettes stay large and readable. */
export function mergeMicroGeometry(geometry: THREE.BufferGeometry, maxTris: number): THREE.BufferGeometry {
  const welded = mergeVertices(geometry, 2e-4)
  const tris = countHarborTriangles(welded)
  if (tris <= maxTris * 1.15) return welded
  const pos = welded.getAttribute('position')
  if (!pos) return welded
  const targetVerts = Math.max(12, Math.floor(maxTris * 0.55))
  const remove = Math.max(0, pos.count - targetVerts)
  if (remove < 8) return welded
  try {
    const simple = new SimplifyModifier().modify(welded, remove)
    simple.computeVertexNormals()
    return mergeVertices(simple, 1e-4)
  } catch {
    return welded
  }
}

function forceSmoothShading(material: THREE.Material) {
  if ('flatShading' in material && (material as THREE.MeshLambertMaterial).flatShading) {
    ;(material as THREE.MeshLambertMaterial).flatShading = false
    material.needsUpdate = true
  }
}

export function auditHarborGeometry(geometry: THREE.BufferGeometry, kind: HarborMeshKind): THREE.BufferGeometry {
  const budget = HARBOR_MESH_BUDGET[kind]
  let geo = geometry
  if (budget.weld || budget.smooth) {
    geo = applyWeightedNormals(geo)
  }
  if (budget.simplify && countHarborTriangles(geo) > budget.maxTris) {
    geo = mergeMicroGeometry(geo, budget.maxTris)
    if (budget.smooth) geo = applyWeightedNormals(geo)
  }
  geo.userData.harborMeshAudited = kind
  return geo
}

/** Audit one mesh in place (replaces geometry when welding/simplifying). */
export function auditHarborMesh(mesh: THREE.Mesh, kind: HarborMeshKind): THREE.Mesh {
  if (mesh.userData.harborMeshAudited) return mesh
  const next = auditHarborGeometry(mesh.geometry, kind)
  if (next !== mesh.geometry) {
    mesh.geometry = next
  }
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  if (HARBOR_MESH_BUDGET[kind].smooth) {
    for (const m of mats) if (m) forceSmoothShading(m)
  }
  mesh.userData.harborMeshAudited = kind
  return mesh
}

export function auditHarborObject(root: THREE.Object3D, kind: HarborMeshKind): number {
  let n = 0
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    auditHarborMesh(mesh, kind)
    n += 1
  })
  return n
}
