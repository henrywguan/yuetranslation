/**
 * Offline smoke — Harbor Quest V2 mesh-only lock + plant / Scout visibility.
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as THREE from 'three'
import {
  HARBOR_V2_ASSETS,
  HARBOR_V2_MESH_ONLY,
  rescaleAndReplantHarborV2Clone,
  type HarborV2AssetId,
} from './harborV2Assets'
import { setProceduralBodyVisible } from './harborProtagonistGlb'

assert.equal(HARBOR_V2_MESH_ONLY, true, 'V2 mesh-only is the live lock')

const ids = Object.keys(HARBOR_V2_ASSETS) as HarborV2AssetId[]
assert.ok(ids.includes('canoe'), 'canoe kit')
assert.ok(ids.includes('pier-module'), 'pier kit')
assert.ok(ids.includes('house-village'), 'house kit')
assert.ok(ids.includes('lantern-paper'), 'lantern kit')
assert.ok(ids.includes('stall-market'), 'stall kit')
assert.ok(ids.includes('save-shack'), 'save-shack kit')
assert.ok(ids.includes('outfitter'), 'outfitter kit')
assert.ok(ids.includes('willow'), 'willow kit')
assert.ok(ids.includes('bridge-arch'), 'bridge kit')

const here = dirname(fileURLToPath(import.meta.url))
const publicRoot = join(here, '../../../public/assets/harbor-quest')
for (const id of ids) {
  const src = HARBOR_V2_ASSETS[id].src
  const path = join(publicRoot, src)
  assert.ok(existsSync(path), `missing public GLB ${src}`)
  const buf = readFileSync(path)
  assert.ok(buf.length > 1000, `${src} looks empty`)
  assert.equal(buf.slice(0, 4).toString('ascii'), 'glTF', `${src} is not a GLB`)
}

const worldSrc = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
assert.match(worldSrc, /HARBOR_V2_MESH_ONLY/, 'world prefers V2 mesh lock')
assert.match(worldSrc, /mountHarborV2Asset/, 'world mounts V2 assets')
assert.match(worldSrc, /house-village|pier-module|canoe/, 'core river kits wired')
assert.match(worldSrc, /attachHarborCastGlb/, 'pier + landmark NPCs use Scout GLB')
assert.match(worldSrc, /applyHarborV2Map/, 'banks and paths use V2 albedos')
assert.match(worldSrc, /v2-bank|v2-arena|v2-barber/, 'remaining landmarks use V2 shells')

const playSrc = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
assert.match(playSrc, /preloadHarborV2Assets/, 'learn preloads V2 kit')

const proSrc = readFileSync(new URL('./harborProtagonist.ts', import.meta.url), 'utf8')
assert.match(proSrc, /mode: pose === 'seated' \? 'canoe'/, 'canoe Scout uses GLB plant')

const glbSrc = readFileSync(new URL('./harborProtagonistGlb.ts', import.meta.url), 'utf8')
assert.match(glbSrc, /plantScoutGlbInCanoe/, 'canoe plant helper')
assert.match(glbSrc, /isScoutGlbSubtree|scoutGlbMesh/, 'procedural hide skips Scout GLB meshes')
assert.match(glbSrc, /attachHarborCastGlb/, 'cast attach helper')
assert.match(glbSrc, /isKeptCastProp/, 'NPC props survive procedural hide')

const v2Src = readFileSync(new URL('./harborV2Assets.ts', import.meta.url), 'utf8')
assert.match(v2Src, /rescaleAndReplantHarborV2Clone/, 'V2 rescales re-plant')
assert.match(v2Src, /placeholder\.position\.y \+ plantY/, 'mount keeps plant Y')

const doc = readFileSync(new URL('../../../../../docs/harbor-quest/V2-MESH-WORLD.md', import.meta.url), 'utf8')
assert.match(doc, /mesh-only/i, 'V2 doc locked')
assert.match(doc, /V1/, 'v1 classified as archive')

// Runtime: origin-centered house must plant with feet on y=0 after rescale.
{
  const wrap = new THREE.Group()
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshLambertMaterial())
  wrap.add(mesh)
  wrap.scale.setScalar(1.2) // pretend catalog load
  wrap.position.y = 1.2 // pretend prior plant for h=2.4
  rescaleAndReplantHarborV2Clone(wrap, 1.8)
  wrap.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(wrap)
  assert.ok(Math.abs(box.min.y) < 0.02, `replant feet near 0, got ${box.min.y}`)
  assert.ok(Math.abs(box.max.y - 1.8) < 0.05, `replant height ~1.8, got ${box.max.y}`)
}

// Runtime: hiding procedural must not blank Scout GLB child meshes.
{
  const root = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.3), new THREE.MeshLambertMaterial())
  body.name = 'procedural-torso'
  root.add(body)
  const glb = new THREE.Group()
  glb.name = 'scout-glb'
  glb.userData.scoutGlb = true
  const glbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.35), new THREE.MeshLambertMaterial())
  glbMesh.userData.scoutGlbMesh = true
  glb.add(glbMesh)
  root.add(glb)
  setProceduralBodyVisible(root, false)
  assert.equal(body.visible, false, 'procedural hidden')
  assert.equal(glbMesh.visible, true, 'Scout GLB mesh stays visible')
  assert.equal(glb.visible, true, 'Scout GLB root stays visible')
}

console.log('harborV2Assets.smoke: ok', ids.length, 'kits')
