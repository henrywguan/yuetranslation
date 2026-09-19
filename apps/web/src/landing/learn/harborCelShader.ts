/**
 * Harbor Quest · anime / Wuxia cel-shader (Three.js r185 + WebGL).
 *
 * Instantly restyles existing Lambert / Standard meshes — no UV remap required.
 * Look target: Genshin / Where Winds Meet — sharp shadow bands, tinted inner
 * shadow, cool rim silhouette, optional ILM (light-ramp) maps.
 *
 * Applied by `hqMat` / `hqMatSmooth` / `hqMatTex` / `harborFigureMat`.
 */
import * as THREE from 'three'

export const HARBOR_CEL_SHADER_ID = 'harbor-cel-v1'

export type HarborCelPresetId = 'character' | 'cloth' | 'lantern' | 'terrain' | 'item'

export type HarborCelParams = {
  /** N·L value where the lit/shadow band splits (0–1). */
  threshold: number
  /** Half-width of the smoothstep band. Tiny = ink-hard step. */
  softness: number
  /** Inner-shadow tint — anime shadows are saturated mid-tones, not black. */
  shadowTint: number
  /** How much albedo survives in shadow (0–1). */
  shadowLift: number
  rimColor: number
  rimPower: number
  rimStrength: number
}

export type HarborCelOptions = Partial<HarborCelParams> & {
  preset?: HarborCelPresetId
  /** 1D / 2D light-ramp texture. Sampled at (litness, 0.5). */
  lightRamp?: THREE.Texture | null
  /**
   * ILM (Index of Light-Map) — Genshin-style control atlas.
   * R = shadow-zone offset (darker = easier to fall into shadow)
   * G = band tightness (darker = harder edge)
   * B = rim-light mask
   * A = unused (reserved)
   */
  ilmMap?: THREE.Texture | null
}

export const HARBOR_CEL_PRESETS: Record<HarborCelPresetId, HarborCelParams> = {
  character: {
    threshold: 0.42,
    softness: 0.032,
    shadowTint: 0x6b548c,
    shadowLift: 0.38,
    rimColor: 0xc4e4ff,
    rimPower: 3.2,
    rimStrength: 0.42,
  },
  cloth: {
    threshold: 0.46,
    softness: 0.038,
    shadowTint: 0x4a5088,
    shadowLift: 0.34,
    rimColor: 0xb8d8f8,
    rimPower: 2.8,
    rimStrength: 0.38,
  },
  lantern: {
    threshold: 0.5,
    softness: 0.06,
    shadowTint: 0x8a5038,
    shadowLift: 0.48,
    rimColor: 0xffd080,
    rimPower: 2.2,
    rimStrength: 0.72,
  },
  terrain: {
    threshold: 0.5,
    softness: 0.075,
    shadowTint: 0x3a4a6a,
    shadowLift: 0.32,
    rimColor: 0xa8c8e0,
    rimPower: 3.6,
    rimStrength: 0.16,
  },
  item: {
    threshold: 0.48,
    softness: 0.04,
    shadowTint: 0x5a4878,
    shadowLift: 0.36,
    rimColor: 0xc8dcf0,
    rimPower: 3.0,
    rimStrength: 0.3,
  },
}

/** GLSL uniforms + helpers injected after `#include <common>`. */
export const HARBOR_CEL_UNIFORMS_GLSL = /* glsl */ `
uniform float uHarborCelThreshold;
uniform float uHarborCelSoftness;
uniform vec3 uHarborShadowTint;
uniform float uHarborShadowLift;
uniform vec3 uHarborRimColor;
uniform float uHarborRimPower;
uniform float uHarborRimStrength;
uniform float uHarborUseLightRamp;
uniform sampler2D uHarborLightRamp;
uniform float uHarborUseIlm;
uniform sampler2D uHarborIlmMap;

float harborCelLuma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec2 harborCelIlmUv() {
  #ifdef USE_MAP
    return vMapUv;
  #elif defined(USE_UV)
    return vUv;
  #else
    return vec2(0.5);
  #endif
}

/**
 * Sharp two-tone ramp. When a light-ramp texture is bound, it replaces the
 * analytic smoothstep so artists can paint extra mid-tone bands.
 */
float harborCelRamp(float litness, float threshold, float softness) {
  if (uHarborUseLightRamp > 0.5) {
    return texture2D(uHarborLightRamp, vec2(clamp(litness, 0.0, 1.0), 0.5)).r;
  }
  float w = max(softness, 1e-4);
  return smoothstep(threshold - w, threshold + w, litness);
}

vec4 harborCelIlmSample() {
  if (uHarborUseIlm < 0.5) {
    return vec4(0.5, 0.5, 1.0, 1.0);
  }
  return texture2D(uHarborIlmMap, harborCelIlmUv());
}

float harborCelNdotL(vec3 geomNormal) {
  float ndotl = 0.55;
  #if (NUM_DIR_LIGHTS > 0)
    ndotl = saturate(dot(geomNormal, directionalLights[0].direction));
  #endif
  return ndotl;
}

/**
 * Cel composite: posterized key light + tinted inner shadow + Fresnel rim.
 * \`litColor\` is the engine's already-lit diffuse (Lambert or Standard).
 */
vec3 harborCelComposite(vec3 litColor, vec3 albedo, vec3 geomNormal, vec3 viewDir, vec3 emissive) {
  vec4 ilm = harborCelIlmSample();
  float ndotl = harborCelNdotL(geomNormal);
  // ILM.R shifts the shadow threshold so faces / folds keep painted zones.
  float threshold = clamp(uHarborCelThreshold + (ilm.r - 0.5) * 0.72, 0.05, 0.95);
  float softness = max(uHarborCelSoftness * mix(0.28, 1.7, ilm.g), 0.001);
  float ramp = harborCelRamp(ndotl, threshold, softness);

  vec3 shadowColor = albedo * uHarborShadowTint * uHarborShadowLift;
  // Keep a whisper of indirect so night scenes do not crush to a flat plate.
  shadowColor += litColor * uHarborShadowTint * 0.22;
  vec3 cel = mix(shadowColor, litColor, ramp);

  float fresnel = pow(1.0 - saturate(dot(geomNormal, viewDir)), max(uHarborRimPower, 0.25));
  float rimMask = ilm.b;
  // Rim is stronger on the shadow side so silhouettes read against dark water.
  float rim = fresnel * uHarborRimStrength * rimMask * mix(1.0, 0.55, ramp);
  cel += uHarborRimColor * rim;
  return cel + emissive;
}
`

/** Replaces Lambert `outgoingLight` assignment. */
export const HARBOR_CEL_APPLY_LAMBERT_GLSL = /* glsl */ `
	vec3 harborCelViewDir = normalize(vViewPosition);
	vec3 harborCelLit = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 outgoingLight = harborCelComposite(harborCelLit, diffuseColor.rgb, normal, harborCelViewDir, totalEmissiveRadiance);
`

/** Replaces Standard / Physical `outgoingLight` assignment (keeps a sliver of spec). */
export const HARBOR_CEL_APPLY_PHYSICAL_GLSL = /* glsl */ `
	vec3 harborCelViewDir = normalize(vViewPosition);
	vec3 harborCelLit = totalDiffuse;
	vec3 outgoingLight = harborCelComposite(harborCelLit, diffuseColor.rgb, normal, harborCelViewDir, totalEmissiveRadiance) + totalSpecular * 0.18;
`

const LAMBERT_OUTGOING =
  'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;'
const PHYSICAL_OUTGOING =
  'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;'

export function resolveHarborCelParams(opts: HarborCelOptions = {}): HarborCelParams {
  const base = HARBOR_CEL_PRESETS[opts.preset ?? 'item']
  return {
    threshold: opts.threshold ?? base.threshold,
    softness: opts.softness ?? base.softness,
    shadowTint: opts.shadowTint ?? base.shadowTint,
    shadowLift: opts.shadowLift ?? base.shadowLift,
    rimColor: opts.rimColor ?? base.rimColor,
    rimPower: opts.rimPower ?? base.rimPower,
    rimStrength: opts.rimStrength ?? base.rimStrength,
  }
}

export type HarborCelUniformBag = {
  uHarborCelThreshold: { value: number }
  uHarborCelSoftness: { value: number }
  uHarborShadowTint: { value: THREE.Color }
  uHarborShadowLift: { value: number }
  uHarborRimColor: { value: THREE.Color }
  uHarborRimPower: { value: number }
  uHarborRimStrength: { value: number }
  uHarborUseLightRamp: { value: number }
  uHarborLightRamp: { value: THREE.Texture | null }
  uHarborUseIlm: { value: number }
  uHarborIlmMap: { value: THREE.Texture | null }
}

export function createHarborCelUniforms(opts: HarborCelOptions = {}): HarborCelUniformBag {
  const p = resolveHarborCelParams(opts)
  const ramp = opts.lightRamp ?? null
  const ilm = opts.ilmMap ?? null
  return {
    uHarborCelThreshold: { value: p.threshold },
    uHarborCelSoftness: { value: p.softness },
    uHarborShadowTint: { value: new THREE.Color(p.shadowTint) },
    uHarborShadowLift: { value: p.shadowLift },
    uHarborRimColor: { value: new THREE.Color(p.rimColor) },
    uHarborRimPower: { value: p.rimPower },
    uHarborRimStrength: { value: p.rimStrength },
    uHarborUseLightRamp: { value: ramp ? 1 : 0 },
    uHarborLightRamp: { value: ramp },
    uHarborUseIlm: { value: ilm ? 1 : 0 },
    uHarborIlmMap: { value: ilm },
  }
}

/** Inject cel uniforms + composite into a Three.js stock fragment shader. */
export function injectHarborCelFragment(fragmentShader: string): string {
  let src = fragmentShader
  if (!src.includes('uHarborCelThreshold')) {
    src = src.replace('#include <common>', `#include <common>\n${HARBOR_CEL_UNIFORMS_GLSL}`)
  }
  if (src.includes(LAMBERT_OUTGOING)) {
    src = src.replace(LAMBERT_OUTGOING, HARBOR_CEL_APPLY_LAMBERT_GLSL)
  } else if (src.includes(PHYSICAL_OUTGOING)) {
    src = src.replace(PHYSICAL_OUTGOING, HARBOR_CEL_APPLY_PHYSICAL_GLSL)
  }
  return src
}

export function isHarborCelMaterial(material: THREE.Material): boolean {
  return material.userData?.harborCelApplied === HARBOR_CEL_SHADER_ID
}

function writeCelUniforms(bag: HarborCelUniformBag, opts: HarborCelOptions) {
  const p = resolveHarborCelParams(opts)
  bag.uHarborCelThreshold.value = p.threshold
  bag.uHarborCelSoftness.value = p.softness
  bag.uHarborShadowTint.value.set(p.shadowTint)
  bag.uHarborShadowLift.value = p.shadowLift
  bag.uHarborRimColor.value.set(p.rimColor)
  bag.uHarborRimPower.value = p.rimPower
  bag.uHarborRimStrength.value = p.rimStrength
  bag.uHarborUseLightRamp.value = opts.lightRamp ? 1 : 0
  bag.uHarborLightRamp.value = opts.lightRamp ?? null
  bag.uHarborUseIlm.value = opts.ilmMap ? 1 : 0
  bag.uHarborIlmMap.value = opts.ilmMap ?? null
}

/**
 * Patch a stock Three.js lit material so it draws with the Harbor cel look.
 * Idempotent — safe to call on shared materials.
 */
export function applyHarborCel<T extends THREE.Material>(material: T, opts: HarborCelOptions = {}): T {
  const resolved: HarborCelOptions = { ...opts, ...resolveHarborCelParams(opts) }
  if (opts.lightRamp) resolved.lightRamp = opts.lightRamp
  if (opts.ilmMap) resolved.ilmMap = opts.ilmMap
  material.userData.harborCel = resolved
  material.userData.harborCelPreset = opts.preset ?? 'item'

  if (isHarborCelMaterial(material)) {
    const bag = material.userData.harborCelUniforms as HarborCelUniformBag | undefined
    if (bag) writeCelUniforms(bag, resolved)
    material.needsUpdate = true
    return material
  }

  const prevCompile = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    prevCompile?.call(material, shader, renderer)
    const bag = createHarborCelUniforms(material.userData.harborCel as HarborCelOptions)
    Object.assign(shader.uniforms, bag)
    material.userData.harborCelUniforms = shader.uniforms
    shader.fragmentShader = injectHarborCelFragment(shader.fragmentShader)
  }
  const prevKey = material.customProgramCacheKey.bind(material)
  material.customProgramCacheKey = () => {
    const o = material.userData.harborCel as HarborCelOptions | undefined
    return `${prevKey()}|${HARBOR_CEL_SHADER_ID}|ramp:${o?.lightRamp ? 1 : 0}|ilm:${o?.ilmMap ? 1 : 0}`
  }
  if (opts.ilmMap && !('map' in material && (material as THREE.MeshLambertMaterial).map)) {
    material.defines = { ...(material.defines ?? {}), USE_UV: '' }
  }
  material.userData.harborCelApplied = HARBOR_CEL_SHADER_ID
  material.needsUpdate = true
  return material
}

/** Walk a scene / kitbash root and cel-shade every lit mesh material. */
export function applyHarborCelToObject(root: THREE.Object3D, opts: HarborCelOptions = {}): number {
  let n = 0
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      if (!m) continue
      if (m instanceof THREE.SpriteMaterial || m instanceof THREE.LineBasicMaterial) continue
      if (m instanceof THREE.MeshBasicMaterial && !m.userData.harborForceCel) continue
      applyHarborCel(m, opts)
      n += 1
    }
  })
  return n
}

const rampCache = new Map<string, THREE.DataTexture>()
const ilmCache = new Map<string, THREE.DataTexture>()

/**
 * Default 1×256 light-ramp: dark band → hairline mid → full lit.
 * Bind as `lightRamp` to paint extra zones without an ILM atlas.
 */
export function makeHarborLightRampTexture(bands: readonly number[] = [0.34, 0.34, 1, 1]): THREE.DataTexture {
  const key = bands.join(',')
  const hit = rampCache.get(key)
  if (hit) return hit
  const w = 256
  const data = new Uint8Array(w * 4)
  for (let i = 0; i < w; i++) {
    const t = i / (w - 1)
    const slot = Math.min(bands.length - 1, Math.floor(t * bands.length))
    const v = Math.round(THREE.MathUtils.clamp(bands[slot] ?? 1, 0, 1) * 255)
    data[i * 4] = v
    data[i * 4 + 1] = v
    data[i * 4 + 2] = v
    data[i * 4 + 3] = 255
  }
  const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  tex.userData.harborLightRamp = true
  rampCache.set(key, tex)
  return tex
}

export type HarborIlmKind = 'neutral' | 'face' | 'cloth' | 'lantern'

/**
 * Procedural ILM so existing unmapped meshes still get painted shadow zones
 * (cheeks / folds / lantern paper) without a hand-authored atlas.
 */
export function makeHarborIlmMap(kind: HarborIlmKind = 'neutral'): THREE.DataTexture {
  const hit = ilmCache.get(kind)
  if (hit) return hit
  const size = 128
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1)
      const v = y / (size - 1)
      let r = 128
      let g = 128
      let b = 255
      if (kind === 'face') {
        // Darker under the nose / chin; brighter cheeks & forehead.
        const cheek = Math.exp(-((u - 0.3) ** 2 + (v - 0.48) ** 2) / 0.04)
        const cheek2 = Math.exp(-((u - 0.7) ** 2 + (v - 0.48) ** 2) / 0.04)
        const underNose = Math.exp(-((u - 0.5) ** 2 + (v - 0.38) ** 2) / 0.02)
        const chin = Math.exp(-((u - 0.5) ** 2 + (v - 0.18) ** 2) / 0.05)
        r = Math.round(THREE.MathUtils.clamp(148 + (cheek + cheek2) * 50 - underNose * 70 - chin * 45, 20, 240))
        g = 110
        b = Math.round(200 + (1 - Math.abs(u - 0.5) * 0.4) * 40)
      } else if (kind === 'cloth') {
        // Soft fold stripes — clothing shadow lanes.
        const fold = 0.5 + 0.5 * Math.sin(v * Math.PI * 6.0)
        r = Math.round(90 + fold * 90)
        g = Math.round(90 + (1 - fold) * 40)
        b = 230
      } else if (kind === 'lantern') {
        // Bright paper center, darker frame.
        const dx = u - 0.5
        const dy = v - 0.5
        const radial = Math.sqrt(dx * dx + dy * dy)
        r = Math.round(THREE.MathUtils.clamp(210 - radial * 180, 40, 240))
        g = 140
        b = 255
      }
      const i = (y * size + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.NoColorSpace
  tex.needsUpdate = true
  tex.userData.harborIlmKind = kind
  ilmCache.set(kind, tex)
  return tex
}

/** Convenience factory — Lambert + Harbor cel (drop-in for new props). */
export function createHarborCelMaterial(
  color: number,
  opts: HarborCelOptions & ConstructorParameters<typeof THREE.MeshLambertMaterial>[0] = {},
) {
  const { preset, threshold, softness, shadowTint, shadowLift, rimColor, rimPower, rimStrength, lightRamp, ilmMap, ...lambert } =
    opts
  const mat = new THREE.MeshLambertMaterial({ color, flatShading: false, ...lambert })
  return applyHarborCel(mat, {
    preset,
    threshold,
    softness,
    shadowTint,
    shadowLift,
    rimColor,
    rimPower,
    rimStrength,
    lightRamp,
    ilmMap,
  })
}
