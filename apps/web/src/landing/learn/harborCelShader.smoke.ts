/**
 * Offline smoke — Harbor anime cel-shader (no WebGL context required).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import {
  applyHarborCel,
  applyHarborCelToObject,
  createHarborCelMaterial,
  createHarborCelUniforms,
  HARBOR_CEL_APPLY_LAMBERT_GLSL,
  HARBOR_CEL_APPLY_PHYSICAL_GLSL,
  HARBOR_CEL_PRESETS,
  HARBOR_CEL_SHADER_ID,
  HARBOR_CEL_UNIFORMS_GLSL,
  injectHarborCelFragment,
  isHarborCelMaterial,
  makeHarborIlmMap,
  makeHarborLightRampTexture,
  resolveHarborCelParams,
} from './harborCelShader'
import { hqMat, hqMatSmooth, hqMatTex, hqWoodTexture } from './harborCraft'
import { harborFigureMat } from './harborFigure'

const LAMBERT_OUTGOING =
  'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;'
const PHYSICAL_OUTGOING =
  'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;'

function main() {
  const src = readFileSync(new URL('./harborCelShader.ts', import.meta.url), 'utf8')
  assert.match(src, /smoothstep/, 'sharp shadow uses smoothstep ramp')
  assert.match(src, /uHarborShadowTint/, 'inner-shadow tint uniform')
  assert.match(src, /fresnel|pow\(1\.0 - saturate\(dot/, 'Fresnel rim-light')
  assert.match(src, /uHarborIlmMap/, 'ILM map uniform')
  assert.match(src, /uHarborLightRamp/, 'custom light-ramp texture')
  assert.match(HARBOR_CEL_UNIFORMS_GLSL, /harborCelRamp/)
  assert.match(HARBOR_CEL_UNIFORMS_GLSL, /harborCelComposite/)
  assert.doesNotMatch(
    HARBOR_CEL_UNIFORMS_GLSL,
    /directionalLights/,
    'helpers must not touch lights before lights_pars exists (iOS compile kill)',
  )
  assert.match(HARBOR_CEL_APPLY_LAMBERT_GLSL, /harborCelComposite/)
  assert.match(HARBOR_CEL_APPLY_LAMBERT_GLSL, /NUM_DIR_LIGHTS/)
  assert.match(HARBOR_CEL_APPLY_PHYSICAL_GLSL, /totalSpecular \* 0\.18/)

  const p = resolveHarborCelParams({ preset: 'character' })
  assert.equal(p.threshold, HARBOR_CEL_PRESETS.character.threshold)
  assert.ok(p.softness < 0.08, 'character band stays near-step, not photoreal')
  assert.notEqual(p.shadowTint, 0x000000, 'anime shadows are tinted, not pitch black')

  const uniforms = createHarborCelUniforms({ preset: 'lantern' })
  assert.ok(uniforms.uHarborRimStrength.value > 0.5, 'lanterns get a glowing rim')
  assert.equal(uniforms.uHarborUseIlm.value, 0)

  const dummyLambert = [
    '#include <common>',
    '#include <uv_pars_fragment>',
    '#include <lights_pars_begin>',
    'void main() {',
    LAMBERT_OUTGOING,
    '}',
  ].join('\n')
  const injectedL = injectHarborCelFragment(dummyLambert)
  assert.match(injectedL, /uHarborCelThreshold/)
  assert.match(injectedL, /harborCelComposite/)
  assert.doesNotMatch(injectedL, new RegExp(LAMBERT_OUTGOING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  const lightsAt = injectedL.indexOf('#include <lights_pars_begin>')
  const helpersAt = injectedL.indexOf('harborCelComposite')
  const mainAt = injectedL.indexOf('void main()')
  assert.ok(lightsAt >= 0 && helpersAt > lightsAt && helpersAt < mainAt, 'cel helpers land after lights pars, before main')

  const dummyPhys = ['#include <common>', PHYSICAL_OUTGOING].join('\n')
  const injectedP = injectHarborCelFragment(dummyPhys)
  assert.match(injectedP, /totalSpecular \* 0\.18/)

  const mat = hqMat(0x3dcfb6)
  assert.equal(mat.flatShading, true)
  assert.ok(isHarborCelMaterial(mat), 'hqMat is cel-patched')
  assert.equal(mat.userData.harborCelPreset, 'terrain')
  assert.equal(mat.userData.harborCelApplied, HARBOR_CEL_SHADER_ID)

  const smooth = hqMatSmooth(0x8a6038)
  assert.equal(smooth.flatShading, false)
  assert.ok(isHarborCelMaterial(smooth))
  assert.equal(smooth.userData.harborCelPreset, 'item')

  const tex = hqMatTex(0x6a4a30, hqWoodTexture())
  assert.ok(isHarborCelMaterial(tex))
  assert.ok(tex.map, 'textured cel still carries the albedo map')

  const fig = harborFigureMat(0xe8c4a8)
  assert.equal(fig.flatShading, false)
  assert.ok(isHarborCelMaterial(fig), 'dress-up figure uses cel')
  assert.equal(fig.userData.harborCelPreset, 'character')

  const created = createHarborCelMaterial(0xc04040, { preset: 'cloth', ilmMap: makeHarborIlmMap('cloth') })
  assert.ok(isHarborCelMaterial(created))
  assert.equal((created.userData.harborCel as { ilmMap?: THREE.Texture }).ilmMap?.userData.harborIlmKind, 'cloth')

  const ramp = makeHarborLightRampTexture()
  assert.equal(ramp.image.width, 256)
  assert.equal(ramp.magFilter, THREE.NearestFilter)
  const face = makeHarborIlmMap('face')
  assert.equal(face.image.width, 128)
  assert.equal(face.userData.harborIlmKind, 'face')

  applyHarborCel(mat, { preset: 'lantern' })
  assert.equal(mat.userData.harborCelPreset, 'lantern', 're-apply updates preset')

  const root = new THREE.Group()
  root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x334455 })))
  root.add(new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff })))
  const n = applyHarborCelToObject(root, { preset: 'item' })
  assert.equal(n, 1, 'sprites are skipped; mesh materials are patched')

  const craftSrc = readFileSync(new URL('./harborCraft.ts', import.meta.url), 'utf8')
  assert.match(craftSrc, /applyHarborCel/, 'craft helpers wire the cel shader')
  const figSrc = readFileSync(new URL('./harborFigure.ts', import.meta.url), 'utf8')
  assert.match(figSrc, /applyHarborCel/, 'figure kit wires the cel shader')

  console.log('harborCelShader.smoke: ok')
}

main()
