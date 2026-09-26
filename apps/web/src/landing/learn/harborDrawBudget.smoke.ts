/**
 * Guan + voyage draw budget.
 * Proves the sailor ring submits fewer meshes than the full island,
 * and that landmarks / ground flags stay in the graph.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GUAN_SATELLITE_ISLANDS } from './harborFishing'
import { buildGuanHarborScene, GUAN_BOAT_START, GUAN_LANDMARKS } from './harborGuanRealm'
import {
  guanCullRadii,
  guanOceanSegments,
  harborMeshLoad,
  harborVoyageCullRadii,
  tickGuanDrawBudget,
} from './harborDrawBudget'

const root = dirname(fileURLToPath(import.meta.url))
const worldSrc = readFileSync(join(root, 'harborWorld.ts'), 'utf8')

assert.match(worldSrc, /tickGuanDrawBudget/, 'voyage tick culls Guan dressing')
assert.match(worldSrc, /harborVoyageCullRadii/, 'voyage props cull on desktop and iPhone')
assert.match(worldSrc, /harborKeepLodChild/, 'ground slabs stay drawn')
assert.match(worldSrc, /guanOceanSegments\(\)/, 'Guan ocean grid is budgeted')
assert.equal(guanOceanSegments(), 16, 'desktop ocean is 16 segments (node is not iPhone)')

const desktop = harborVoyageCullRadii(8.6)
assert.ok(desktop.prop >= 40 && desktop.dock > desktop.prop, 'desktop dock ring wider than props')
const guanR = guanCullRadii()
assert.ok(guanR.flora < guanR.village && guanR.village >= 24, 'villages stay readable before flora ring')

const scene = buildGuanHarborScene()
let customs = 0
let looms = 0
let sats = 0
scene.traverse((o) => {
  if (o.name === 'guan-customs-officer') customs++
  if (o.name === 'guan-cape-loom') looms++
  if (typeof o.name === 'string' && o.name.startsWith('guan-sat-') && o.parent === scene) sats++
})
assert.equal(customs, 1, 'Customs officer still in the scene')
assert.equal(looms, 1, 'Cape Loom still in the scene')
assert.equal(sats, GUAN_SATELLITE_ISLANDS.length, 'one group per satellite cay')

const places = Number(scene.userData.guanTuftPlaces ?? 0)
assert.ok(places >= 36, `instanced tuft places ${places}`)

// Full island (every dressing group forced on, every blade instanced).
for (const c of scene.children) {
  if (c.userData.harborCull) c.visible = true
  if (c.userData.guanTuftSync && 'count' in c) {
    const blades = (c.userData.guanTuftBlades as unknown[] | undefined)?.length ?? 0
    ;(c as { count: number }).count = blades
  }
}
const full = harborMeshLoad(scene)

tickGuanDrawBudget(scene, GUAN_BOAT_START.x, GUAN_BOAT_START.z)
const atMusa = harborMeshLoad(scene)
assert.ok(atMusa.meshes < full.meshes, `Musa meshes ${atMusa.meshes} should be under full ${full.meshes}`)
assert.ok(
  atMusa.meshes <= full.meshes * 0.82,
  `Musa draw ${atMusa.meshes}/${full.meshes} meshes should drop at least 18%`,
)
assert.ok(atMusa.tris < full.tris, `Musa tris ${atMusa.tris} < full ${full.tris}`)

let hiddenSats = 0
for (const c of scene.children) {
  if (c.userData.harborCull === 'satellite' && !c.visible) hiddenSats++
}
assert.ok(hiddenSats >= 2, `far cays hidden at Musa spawn (hidden ${hiddenSats})`)

const customsNode = scene.getObjectByName('guan-customs-officer')
assert.ok(customsNode?.visible !== false, 'Customs stays visible at the spawn dock')

// South village is outside the Musa flora ring — huts there should hide.
tickGuanDrawBudget(scene, GUAN_LANDMARKS.musaPoint.x, GUAN_LANDMARKS.musaPoint.z)
let hiddenHuts = 0
let shownHuts = 0
for (const c of scene.children) {
  if (c.name !== 'guan-hut') continue
  if (c.visible) shownHuts++
  else hiddenHuts++
}
assert.ok(hiddenHuts >= 1, 'distant huts drop out at Musa')
assert.ok(shownHuts >= 1, 'nearby town huts stay')

// Standing in Shilo brings that village back (no permanent delete).
tickGuanDrawBudget(scene, GUAN_LANDMARKS.shilo.x, GUAN_LANDMARKS.shilo.z)
let shiloHuts = 0
for (const c of scene.children) {
  if (c.name === 'guan-hut' && c.visible) {
    const d = Math.hypot(c.position.x - GUAN_LANDMARKS.shilo.x, c.position.z - GUAN_LANDMARKS.shilo.z)
    if (d < 8) shiloHuts++
  }
}
assert.ok(shiloHuts >= 1, 'Shilo huts return when the sailor arrives')

const loom = scene.getObjectByName('guan-cape-loom')
assert.equal(loom?.visible, true, 'Cape Loom is not dressing — it never distance-hides')

console.log(
  `harborDrawBudget ok — Musa ${atMusa.meshes} meshes / ${atMusa.tris} tris vs full ${full.meshes} / ${full.tris} (${Math.round((1 - atMusa.meshes / full.meshes) * 100)}% fewer meshes)`,
)
