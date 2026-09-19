/**
 * Offline smoke — anime cel foundation (no WebGL context required for most asserts).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import {
  applyHarborCelToObject,
  createHarborCelGradientMap,
  createHarborCelMaterial,
  createHarborCelMatSmooth,
  HARBOR_CEL_RAMP_STEPS,
  HARBOR_CEL_SHADE_ENABLED,
  harborMaterialToCel,
} from './harborCelMaterial'

const here = dirname(fileURLToPath(import.meta.url))
const celSrc = readFileSync(join(here, 'harborCelMaterial.ts'), 'utf8')
const glbSrc = readFileSync(join(here, 'harborGlbAssets.ts'), 'utf8')
const scoutSrc = readFileSync(join(here, 'harborProtagonistGlb.ts'), 'utf8')
const docSrc = readFileSync(
  join(here, '../../../../../docs/harbor-quest/ANIME-CEL-FOUNDATION.md'),
  'utf8',
)

assert.equal(HARBOR_CEL_SHADE_ENABLED, true, 'cel shade on for cinematic meshes')
assert.ok(HARBOR_CEL_RAMP_STEPS >= 3 && HARBOR_CEL_RAMP_STEPS <= 5, 'ramp steps in anime band')

assert.match(celSrc, /uRimStrength/, 'rim strength uniform')
assert.match(celSrc, /uShadowThreshold/, 'sharp shadow threshold')
assert.match(celSrc, /gradientMap/, 'toon gradient map')
assert.match(celSrc, /MeshToonMaterial/, 'uses MeshToonMaterial base')
assert.match(celSrc, /onBeforeCompile/, 'GLSL hooks via onBeforeCompile')
assert.match(celSrc, /harborRim/, 'rim lighting GLSL')

assert.match(glbSrc, /loadHarborGlb/, 'generic GLB loader for game-asset drops')
assert.match(glbSrc, /harborGlbMaterialToLambertCel/, 'GLB loader converts to Lambert + cel')
assert.match(glbSrc, /HARBOR_GLB_PUBLIC_ROOT/, 'public assets root')

assert.match(scoutSrc, /harborGlbMaterialToLambertCel/, 'Scout GLB convert to Lambert + cel')
assert.match(scoutSrc, /HARBOR_SCOUT_GLB_ENABLED = true/, 'standing Scout uses the authored GLB')

assert.match(docSrc, /game-asset MCP/, 'foundation doc mentions game-asset MCP')
assert.match(docSrc, /GLSL/, 'doc clarifies GLSL not HLSL for Three.js')

const ramp = createHarborCelGradientMap(4)
assert.equal(ramp.image.width, 4, 'gradient map width = steps')
assert.equal(ramp.magFilter, THREE.NearestFilter, 'nearest ramp (hard steps)')

const mat = createHarborCelMaterial({ color: 0x3dcfb6 })
assert.ok(mat.userData.harborCel, 'cel userData flag')
assert.ok(mat.gradientMap, 'gradientMap assigned')
assert.ok(mat.color.getHex() === 0x3dcfb6, 'albedo color preserved')

const lambert = new THREE.MeshLambertMaterial({ color: 0xff0000 })
const converted = harborMaterialToCel(lambert)
assert.ok(converted.userData.harborCel, 'Lambert → cel')
assert.notEqual(converted, lambert, 'conversion returns new material')

const smooth = createHarborCelMatSmooth(0xf0d0b8)
const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lambert.clone())
const g = new THREE.Group()
g.add(box)
const n = applyHarborCelToObject(g, true)
assert.ok(n >= 1, `applyHarborCelToObject swapped materials (got ${n})`)
assert.ok((box.material as THREE.Material).userData.harborCel, 'mesh now cel')
assert.ok(smooth.userData.harborCel, 'smooth factory is cel')

console.log('harborCelMaterial.smoke: ok')
