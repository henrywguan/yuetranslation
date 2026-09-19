import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { buildClothingMesh } from './harborClothingMeshes'
import { hqRock } from './harborCraft'
import { harborFigureHead, harborFigureMat } from './harborFigure'
import {
  applyWeightedNormals,
  auditHarborGeometry,
  auditHarborObject,
  countHarborTriangles,
  HARBOR_MESH_BUDGET,
  mergeMicroGeometry,
} from './harborMeshAudit'
import { buildHarborProtagonist } from './harborProtagonist'

function main() {
  const src = readFileSync(new URL('./harborMeshAudit.ts', import.meta.url), 'utf8')
  assert.match(src, /applyWeightedNormals/)
  assert.match(src, /weldHarborPositions/)
  assert.match(src, /mergeMicroGeometry/)
  assert.match(src, /SimplifyModifier/)
  assert.ok(HARBOR_MESH_BUDGET.clothing.maxTris < HARBOR_MESH_BUDGET.character.maxTris)

  const box = new THREE.BoxGeometry(1, 1, 1)
  const before = countHarborTriangles(box)
  const weighted = applyWeightedNormals(box)
  assert.ok(weighted.getAttribute('normal'), 'weighted normals written')
  assert.ok(countHarborTriangles(weighted) >= 1)
  // Welded box shares corners — fewer unique verts than 24.
  assert.ok(weighted.getAttribute('position').count < box.getAttribute('position').count)

  const noisy = new THREE.SphereGeometry(1, 32, 24)
  const simplified = mergeMicroGeometry(noisy, 80)
  assert.ok(
    countHarborTriangles(simplified) < countHarborTriangles(noisy),
    'micro-geo merge drops leftover triangles',
  )

  const terrain = auditHarborGeometry(new THREE.IcosahedronGeometry(1, 2), 'terrain')
  assert.equal(terrain.userData.harborMeshAudited, 'terrain')

  const head = harborFigureHead(harborFigureMat(0xe8c4a8), 1)
  assert.ok(head.geometry.getAttribute('normal'), 'figure head keeps authored smooth normals')
  assert.ok(!head.userData.harborMeshAudited, 'figure kit is not position-welded (kept the dress-up mesh)')

  const rock = hqRock(() => 0.4)
  assert.equal(rock.userData.harborMeshAudited, 'terrain')
  assert.equal((rock.material as THREE.MeshLambertMaterial).flatShading, false)

  const cloth = buildClothingMesh('top', 'robe-festival', { color: 0x1e3a48, accent: 0x3dcfb6 })
  assert.ok(cloth)
  let clothAudited = 0
  cloth.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.userData.harborMeshAudited === 'clothing') clothAudited += 1
  })
  assert.equal(clothAudited, 0, 'wardrobe meshes skip the weld audit so silhouettes stay authored')

  const scout = buildHarborProtagonist({ pose: 'standing' })
  let scoutAudited = 0
  scout.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.userData.harborMeshAudited === 'character') scoutAudited += 1
  })
  assert.equal(scoutAudited, 0, 'scout figure is not welded/simplified')
  assert.equal(scout.userData.usesScoutGlb, false, 'voyage scout is the dress-up figure, not the Meshy GLB')

  const group = new THREE.Group()
  group.add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 12), new THREE.MeshLambertMaterial({ flatShading: true })))
  assert.equal(auditHarborObject(group, 'lantern'), 1)
  const lamp = group.children[0] as THREE.Mesh
  assert.equal((lamp.material as THREE.MeshLambertMaterial).flatShading, false, 'lantern audit clears flatShading')

  const figSrc = readFileSync(new URL('./harborFigure.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(figSrc, /auditHarborMesh/, 'figure kit no longer runs the mesh audit')
  const worldSrc = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
  assert.match(worldSrc, /auditHarborObject\(g, 'lantern'\)/, 'pier + boat lanterns audited')

  assert.ok(before >= 12)
  console.log('harborMeshAudit.smoke: ok')
}

main()
