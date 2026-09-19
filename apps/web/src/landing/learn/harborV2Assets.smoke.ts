/**
 * Offline smoke — Harbor Quest V2 mesh-only lock.
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  HARBOR_V2_ASSETS,
  HARBOR_V2_MESH_ONLY,
  type HarborV2AssetId,
} from './harborV2Assets'

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

const playSrc = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
assert.match(playSrc, /preloadHarborV2Assets/, 'learn preloads V2 kit')

const proSrc = readFileSync(new URL('./harborProtagonist.ts', import.meta.url), 'utf8')
assert.match(proSrc, /mode: pose === 'seated' \? 'canoe'/, 'canoe Scout uses GLB plant')

const glbSrc = readFileSync(new URL('./harborProtagonistGlb.ts', import.meta.url), 'utf8')
assert.match(glbSrc, /plantScoutGlbInCanoe/, 'canoe plant helper')

const doc = readFileSync(new URL('../../../../../docs/harbor-quest/V2-MESH-WORLD.md', import.meta.url), 'utf8')
assert.match(doc, /mesh-only/i, 'V2 doc locked')
assert.match(doc, /V1/, 'v1 classified as archive')

console.log('harborV2Assets.smoke: ok', ids.length, 'kits')
