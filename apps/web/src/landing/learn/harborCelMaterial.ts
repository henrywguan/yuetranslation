/**
 * Harbor Quest · anime / wuxia cel-shader foundation (Three.js GLSL).
 *
 * Target look: Genshin-like step lighting, sharp shadow ramp, outer rim contour.
 * Harbor runs WebGL via Three.js — this is GLSL (not Unity HLSL). Same lighting
 * model; port the fragment math to HLSL later if a native client appears.
 *
 * Pairs with:
 * - Scout GLB import (`harborProtagonistGlb.ts`)
 * - Future game-asset MCP / Higgsfield `generate_3d` GLBs (`harborGlbAssets.ts`)
 *
 * See docs/harbor-quest/ANIME-CEL-FOUNDATION.md
 */
import * as THREE from 'three'

/** Master switch — cel shade imported cinematic meshes by default. */
export const HARBOR_CEL_SHADE_ENABLED = true

/** Discrete shade bands (2–5). Higher = softer steps. */
export const HARBOR_CEL_RAMP_STEPS = 4

/** N·L threshold below which the hard shadow band kicks in (0–1 half-Lambert). */
export const HARBOR_CEL_SHADOW_THRESHOLD = 0.42

/** Fresnel rim strength (0 = off). */
export const HARBOR_CEL_RIM_STRENGTH = 0.42

/** Fresnel power — higher = thinner contour. */
export const HARBOR_CEL_RIM_POWER = 2.8

/** Cool wuxia rim (harbor mist / jade night). */
export const HARBOR_CEL_RIM_COLOR = 0xa8d8ff

/** Multiply base albedo in the shadow band (keeps hue, drops value). */
export const HARBOR_CEL_SHADOW_TINT = 0x6a7a98

const gradientCache = new Map<number, THREE.DataTexture>()

/**
 * 1×N nearest ramp — classic toon gradient map for MeshToonMaterial.
 * Left = shadow, right = lit. Steps are hard (no lerp between texels).
 */
export function createHarborCelGradientMap(
  steps: number = HARBOR_CEL_RAMP_STEPS,
): THREE.DataTexture {
  const n = Math.max(2, Math.min(8, Math.floor(steps)))
  const hit = gradientCache.get(n)
  if (hit) return hit

  const data = new Uint8Array(n * 4)
  for (let i = 0; i < n; i++) {
    // Bias mid-tones upward so faces stay readable under Harbor fill light.
    const t = i / (n - 1)
    const v = Math.round(48 + t * t * 207)
    data[i * 4] = v
    data[i * 4 + 1] = v
    data[i * 4 + 2] = v
    data[i * 4 + 3] = 255
  }
  const tex = new THREE.DataTexture(data, n, 1)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  tex.colorSpace = THREE.NoColorSpace
  gradientCache.set(n, tex)
  return tex
}

export type HarborCelMaterialOpts = {
  color?: THREE.ColorRepresentation
  map?: THREE.Texture | null
  transparent?: boolean
  opacity?: number
  side?: THREE.Side
  /** Override ramp steps for this material. */
  rampSteps?: number
  rimStrength?: number
  rimPower?: number
  rimColor?: THREE.ColorRepresentation
  shadowTint?: THREE.ColorRepresentation
  flatShading?: boolean
}

type CelUniforms = {
  uRimStrength: { value: number }
  uRimPower: { value: number }
  uRimColor: { value: THREE.Color }
  uShadowTint: { value: THREE.Color }
  uShadowThreshold: { value: number }
}

/**
 * Inject step-shadow + rim into MeshToonMaterial’s fragment program.
 * Kept as explicit GLSL so agents can tune the anime look without PBR.
 */
function attachHarborCelShaderHooks(
  mat: THREE.MeshToonMaterial,
  opts: HarborCelMaterialOpts,
): void {
  const uniforms: CelUniforms = {
    uRimStrength: { value: opts.rimStrength ?? HARBOR_CEL_RIM_STRENGTH },
    uRimPower: { value: opts.rimPower ?? HARBOR_CEL_RIM_POWER },
    uRimColor: { value: new THREE.Color(opts.rimColor ?? HARBOR_CEL_RIM_COLOR) },
    uShadowTint: { value: new THREE.Color(opts.shadowTint ?? HARBOR_CEL_SHADOW_TINT) },
    uShadowThreshold: { value: HARBOR_CEL_SHADOW_THRESHOLD },
  }
  mat.userData.harborCel = true
  mat.userData.harborCelUniforms = uniforms

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
#include <common>
uniform float uRimStrength;
uniform float uRimPower;
uniform vec3 uRimColor;
uniform vec3 uShadowTint;
uniform float uShadowThreshold;
`,
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
// Sharp shadow band — pull albedo toward cool tint below threshold.
float harborShade = outgoingLight.r + outgoingLight.g + outgoingLight.b;
float harborHard = step(uShadowThreshold * 3.0, harborShade);
outgoingLight = mix(outgoingLight * uShadowTint, outgoingLight, harborHard);

// Outer rim-light contour (view-space Fresnel).
vec3 harborViewDir = normalize(-vViewPosition);
float harborRim = pow(1.0 - saturate(dot(normal, harborViewDir)), uRimPower) * uRimStrength;
outgoingLight += uRimColor * harborRim;

#include <opaque_fragment>
`,
      )
  }
  mat.customProgramCacheKey = () =>
    `harbor-cel-v1-${opts.rampSteps ?? HARBOR_CEL_RAMP_STEPS}`
  mat.needsUpdate = true
}

/**
 * Create a Harbor anime cel material (toon ramp + rim + hard shadow).
 * Exposes standard `.color` / `.map` so wardrobe recolor paths keep working.
 */
export function createHarborCelMaterial(opts: HarborCelMaterialOpts = {}): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    color: opts.color ?? 0xffffff,
    map: opts.map ?? null,
    gradientMap: createHarborCelGradientMap(opts.rampSteps ?? HARBOR_CEL_RAMP_STEPS),
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  })
  // MeshToonMaterial typings omit flatShading; still honored at runtime for craft flats.
  if (opts.flatShading) {
    ;(mat as THREE.MeshToonMaterial & { flatShading?: boolean }).flatShading = true
  }
  attachHarborCelShaderHooks(mat, opts)
  return mat
}

/** Flat architecture variant — harder bands, weaker rim. */
export function createHarborCelMatFlat(color: number): THREE.MeshToonMaterial {
  return createHarborCelMaterial({
    color,
    flatShading: true,
    rampSteps: 3,
    rimStrength: 0.22,
  })
}

/** Smooth organic variant — heads, cloth, imported anime meshes. */
export function createHarborCelMatSmooth(color: number): THREE.MeshToonMaterial {
  return createHarborCelMaterial({
    color,
    flatShading: false,
    rampSteps: HARBOR_CEL_RAMP_STEPS,
    rimStrength: HARBOR_CEL_RIM_STRENGTH,
  })
}

function isCelMaterial(mat: THREE.Material): mat is THREE.MeshToonMaterial {
  return Boolean(mat.userData?.harborCel)
}

/**
 * Convert an existing Standard / Lambert / Phong / Basic material into cel,
 * preserving albedo map + color + opacity.
 */
export function harborMaterialToCel(source: THREE.Material): THREE.Material {
  if (isCelMaterial(source)) return source

  const color =
    'color' in source && source.color instanceof THREE.Color
      ? (source.color as THREE.Color).getHex()
      : 0xffffff
  const map =
    'map' in source && source.map instanceof THREE.Texture ? (source.map as THREE.Texture) : null
  const transparent = source.transparent
  const opacity = source.opacity
  const side = source.side

  const cel = createHarborCelMaterial({
    color,
    map,
    transparent,
    opacity,
    side,
    flatShading: 'flatShading' in source ? Boolean((source as THREE.MeshLambertMaterial).flatShading) : false,
  })
  cel.name = source.name || 'harbor-cel'
  return cel
}

/** Walk a GLB / craft root and swap lit materials for Harbor cel. */
export function applyHarborCelToObject(root: THREE.Object3D, cloneMaterials = true): number {
  if (!HARBOR_CEL_SHADE_ENABLED) return 0
  let n = 0
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !mesh.material) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const next = mats.map((m) => {
      const src = cloneMaterials ? m : m
      const cel = harborMaterialToCel(src)
      if (cel !== m) n++
      return cel
    })
    mesh.material = next.length === 1 ? next[0]! : next
  })
  return n
}

/** Tune rim at runtime (day vs night Harbor lighting). */
export function setHarborCelRim(
  mat: THREE.Material,
  strength: number,
  color?: THREE.ColorRepresentation,
): void {
  const u = mat.userData.harborCelUniforms as CelUniforms | undefined
  if (!u) return
  u.uRimStrength.value = strength
  if (color != null) u.uRimColor.value.set(color)
}

/** Night: stronger cool rim so silhouettes pop against dark water. */
export function applyHarborCelNightRim(root: THREE.Object3D, night: boolean): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      if (!m) continue
      setHarborCelRim(m, night ? 0.62 : HARBOR_CEL_RIM_STRENGTH, night ? 0x8ec8ff : HARBOR_CEL_RIM_COLOR)
    }
  })
}
