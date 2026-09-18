/**
 * Offline smoke for character looks v1–v4 (wardrobe, modular, appearance, anim).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  HARBOR_DEFAULT_APPEARANCE,
  HARBOR_EYE_STYLES,
  HARBOR_FACE_STYLES,
  HARBOR_HAIR_STYLES,
  appearanceEqual,
  sanitizeHarborAppearance,
} from './harborAppearance'
import {
  buildClothingMesh,
  clothingUsesScoutBase,
} from './harborClothingMeshes'
import {
  HARBOR_DEFAULT_LOOK,
  HARBOR_GEAR_CATALOG,
  applyLookToProtagonist,
  harborGearCodexStats,
  harborGearMeshInfo,
} from './harborGear'
import { harborModularPartNames, planHarborModularCompose } from './harborModularLook'
import { buildHarborProtagonist } from './harborProtagonist'
import {
  HARBOR_PROTAGONIST_CLIPS,
  ensureHarborProtagonistLimbs,
  harborProtagonistClipName,
  tickHarborProtagonistAnim,
} from './harborProtagonistAnim'

assert.ok(HARBOR_HAIR_STYLES.includes('twin') && HARBOR_HAIR_STYLES.includes('wave'), 'v3 hair styles')
assert.ok(
  HARBOR_HAIR_STYLES.includes('bald') &&
    HARBOR_HAIR_STYLES.includes('curtains') &&
    HARBOR_HAIR_STYLES.includes('ridge') &&
    HARBOR_HAIR_STYLES.includes('pony'),
  'hairdresser silhouette set (bald/curtains/ridge/pony)',
)
assert.ok(HARBOR_HAIR_STYLES.length >= 11, 'salon catalog covers classic silhouette families')
assert.ok(HARBOR_EYE_STYLES.length >= 4 && HARBOR_FACE_STYLES.length >= 4, 'v3 eyes/faces')
assert.equal(sanitizeHarborAppearance({}).eyeStyle, 'round')
assert.equal(appearanceEqual(HARBOR_DEFAULT_APPEARANCE, sanitizeHarborAppearance({})), true)

// Distinct eye silhouettes + hair clear of skull
const eyeGeom = new Set<string>()
for (const eyeStyle of HARBOR_EYE_STYLES) {
  const s = buildHarborProtagonist({
    pose: 'standing',
    bareHead: true,
    appearance: { ...HARBOR_DEFAULT_APPEARANCE, eyeStyle },
  })
  s.traverse((o) => {
    const m = o as import('three').Mesh
    if (!m.isMesh || !m.geometry) return
    let p: import('three').Object3D | null = m
    let underEyes = false
    while (p) {
      if (p.userData?.harborEyes || p.name === 'scout-eyes') underEyes = true
      p = p.parent
    }
    if (underEyes) eyeGeom.add(m.geometry.type)
  })
}
assert.ok(eyeGeom.has('CircleGeometry'), 'round/bright eyes use circle inserts')
assert.ok(eyeGeom.has('PlaneGeometry'), 'almond/sleepy eyes use plane inserts')
assert.ok(eyeGeom.size >= 2, 'eye styles use more than one geometry family')

const fringeScout = buildHarborProtagonist({
  pose: 'standing',
  bareHead: true,
  appearance: { ...HARBOR_DEFAULT_APPEARANCE, hairStyle: 'fringe' },
})
const skullZ = 0.155 * 0.92
let bangOk = false
fringeScout.traverse((o) => {
  if (!o.userData?.harborHair && o.parent && !(o.parent as { userData?: { harborHair?: boolean } }).userData?.harborHair) {
    return
  }
  const m = o as import('three').Mesh
  if (!m.isMesh) return
  // Bang pieces must sit at or beyond the skull front
  if (m.position.z > skullZ + 0.02) bangOk = true
})
assert.ok(bangOk, 'fringe bang clears the skull front')

const figureSrc = readFileSync(new URL('./harborFigure.ts', import.meta.url), 'utf8')
assert.match(figureSrc, /harborFigureHeadExtents/, 'shared skull extents for hair/face')
assert.match(figureSrc, /eyeStyle/, 'face builder reads eyeStyle')
const proSrc = readFileSync(new URL('./harborProtagonist.ts', import.meta.url), 'utf8')
assert.match(proSrc, /bangZ|harborFigureHeadExtents/, 'hair uses skull-clear bang depth')

const bamboo = HARBOR_GEAR_CATALOG.find((i) => i.id === 'hat-bamboo')!
assert.equal(harborGearMeshInfo(bamboo).uniqueMesh, true, 'bamboo hat unique silhouette')
assert.ok(!clothingUsesScoutBase(harborGearMeshInfo(bamboo).family))

const straw = HARBOR_GEAR_CATALOG.find((i) => i.id === 'hat-straw')!
assert.equal(harborGearMeshInfo(straw).uniqueMesh, false, 'straw stays scout base')

const tunic = buildClothingMesh('top', 'top-jade-river-tunic', { color: 0x2a6a58, accent: 0x3dcfb6 })
assert.ok(tunic && tunic.children.length > 0, 'v1 clothing builder returns mesh')

const scout = buildHarborProtagonist({ pose: 'standing' })
applyLookToProtagonist(scout, {
  ...HARBOR_DEFAULT_LOOK,
  hat: 'hat-bamboo',
  top: 'top-jade',
  bottom: 'bottom-reed',
  shoes: 'shoes-straw',
})
let cloth = 0
scout.traverse((o) => {
  if (o.userData.harborClothing) cloth += 1
})
assert.ok(cloth >= 4, 'applyLook attaches wardrobe silhouettes')

const plan = planHarborModularCompose(HARBOR_DEFAULT_APPEARANCE, {
  ...HARBOR_DEFAULT_LOOK,
  top: 'top-merchant',
})
assert.equal(plan.covered.top, true)
assert.ok(!plan.visibleBody.includes('under_top'))
assert.ok(harborModularPartNames().includes('slot_hat'))

ensureHarborProtagonistLimbs(scout)
let walked = tickHarborProtagonistAnim(scout, { mode: 'walk', t: 0 }, 0.05)
walked = tickHarborProtagonistAnim(scout, walked, 0.05)
assert.equal(harborProtagonistClipName('walk'), HARBOR_PROTAGONIST_CLIPS.walk)
assert.ok(walked.t > 0)

const codex = harborGearCodexStats()
assert.ok(codex.uniqueMeshes > 20, 'v1 raises unique clothing mesh count')

const prd = readFileSync(new URL('../../../../../docs/harbor-quest/character-looks-v1-v4.md', import.meta.url), 'utf8')
assert.match(prd, /v1 — Silhouette wardrobe/)
assert.match(prd, /KayKit/)

console.log('harborCharacterLooks.smoke: ok', 'uniqueMeshes', codex.uniqueMeshes)
