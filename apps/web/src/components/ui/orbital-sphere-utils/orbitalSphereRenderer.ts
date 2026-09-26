import * as THREE from 'three'

export type OrbitalSphereVariant = 'harbor' | 'creators'

export type OrbitalSpherePlacement = 'page' | 'stage'

export type OrbitalSphereOptions = {
  speed: number
  particleSize: number
  particleOpacity: number
  orbitOpacity: number
  scale: number
  haloOpacity: number
  /** CSS hue-rotate degrees applied by the host canvas filter. */
  hue: number
  /**
   * `harbor` — homepage / pricing neon-jade orbital.
   * `creators` — ink/celadon, slower, Chao tone-letter glyphs + seal nodes.
   */
  variant: OrbitalSphereVariant
  /**
   * `page` — marketing hero: wide viewports park the globe on the right.
   * `stage` — Practice Partner: always centered in the host, including desktop.
   */
  placement: OrbitalSpherePlacement
}

/** Defaults tuned for JyutTranslate harbor/jade (not the stock violet ThreeUI look). */
export const ORBITAL_SPHERE_DEFAULTS: OrbitalSphereOptions = {
  speed: 1,
  particleSize: 0.015,
  particleOpacity: 0.72,
  orbitOpacity: 0.28,
  scale: 1,
  haloOpacity: 0.22,
  hue: 0,
  variant: 'harbor',
  placement: 'page',
}

/** Creators-page preset — contemplative, type-forward, less neon. */
export const ORBITAL_SPHERE_CREATORS: OrbitalSphereOptions = {
  speed: 0.65,
  particleSize: 0.011,
  particleOpacity: 0.38,
  orbitOpacity: 0.16,
  scale: 1.06,
  haloOpacity: 0.14,
  hue: -10,
  variant: 'creators',
  placement: 'page',
}

const HARBOR = {
  particleHi: 0x7aebd4,
  particleLo: 0x1a6b5c,
  orbit: 0x3dcfb6,
  node: 0xb8ead0,
  halo: 0x3dcfb6,
} as const

const CREATORS = {
  particleHi: 0x9bb8a8,
  particleLo: 0x2a3d38,
  orbit: 0x5a8f7c,
  node: 0xc5d4c8,
  halo: 0x6a9e88,
} as const

/** Chao tone letters only — the six Cantonese contours (no 漢字). */
const CREATORS_GLYPHS = ['˥', '˧˥', '˧', '˨˩', '˩˧', '˨'] as const

/** Seal accents also stay in Chao — no Chinese characters on this stage. */
const CREATORS_SEAL_CHARS = ['˥', '˨˩'] as const

/**
 * Chao tone sample used to force-load Noto Sans glyph coverage.
 * Canvas sprites never appear in the DOM, so Google Fonts would otherwise
 * skip the Spacing Modifier Letters subset and paint tofu boxes.
 */
export const ORBITAL_CREATORS_FONT_SAMPLE = CREATORS_GLYPHS.join('')

/** Canvas stack: Noto Sans first (Chao tones), HK only as Latin/CJK fallback. */
const ORBITAL_GLYPH_FONT = '"Noto Sans", "Noto Sans HK", system-ui, sans-serif'

/** Wait until Noto Sans can paint Chao tone letters before building textures. */
export async function ensureOrbitalCreatorsFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return
  const sample = ORBITAL_CREATORS_FONT_SAMPLE
  try {
    await Promise.all([
      document.fonts.load(`500 60px ${ORBITAL_GLYPH_FONT}`, sample),
      document.fonts.load(`600 58px ${ORBITAL_GLYPH_FONT}`, sample),
      document.fonts.ready,
    ])
  } catch {
    // Still build sprites — system fallback beats a hung mount.
  }
}

function makeGlyphTexture(text: string, fill: string): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = fill
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const fontSize = text.length > 1 ? 48 : 60
  ctx.font = `500 ${fontSize}px ${ORBITAL_GLYPH_FONT}`
  ctx.globalAlpha = 0.94
  ctx.fillText(text, size / 2, size / 2 + 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/** Circular seal / chop — soft vermillion frame around a Chao tone letter. */
function makeSealTexture(char: string): THREE.CanvasTexture {
  const size = 160
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  ctx.clearRect(0, 0, size, size)
  const cx = size / 2
  const cy = size / 2
  const r = 58

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(176, 52, 48, 0.88)'
  ctx.lineWidth = 5
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, r - 10, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(176, 52, 48, 0.45)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = 'rgba(176, 52, 48, 0.9)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const fontSize = char.length > 1 ? 46 : 58
  ctx.font = `600 ${fontSize}px ${ORBITAL_GLYPH_FONT}`
  ctx.fillText(char, cx, cy + 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function makeRoundPointTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)
  ctx.clearRect(0, 0, size, size)
  const c = size / 2
  const grad = ctx.createRadialGradient(c, c, c * 0.15, c, c, c)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.62, 'rgba(255,255,255,0.95)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(c, c, c, 0, Math.PI * 2)
  ctx.fill()
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function fibonacciPoint(i: number, n: number, radius: number) {
  const phi = Math.acos(-1 + (2 * i) / n)
  const theta = Math.sqrt(n * Math.PI) * phi
  return {
    x: radius * Math.cos(theta) * Math.sin(phi),
    y: radius * Math.sin(theta) * Math.sin(phi),
    z: radius * Math.cos(phi),
  }
}

const SPHERE_RADIUS = 2.2
const CAMERA_FOV = 45

export type OrbitalSphereLayout = {
  x: number
  y: number
  z: number
  scale: number
  cameraZ: number
}

/**
 * Wide marketing pages park the globe on the right (`width >= 1024`).
 * Practice Partner uses `stage` so the same globe stays centered and large
 * enough to read as spinning on a desktop card or fullscreen window.
 */
export function resolveOrbitalSphereLayout(
  width: number,
  height: number,
  variant: OrbitalSphereVariant,
  placement: OrbitalSpherePlacement = 'page',
): OrbitalSphereLayout {
  const isCreators = variant === 'creators'
  const pageWide = placement !== 'stage' && width >= 1024
  if (pageWide) {
    return {
      x: isCreators ? 2.2 : 2.5,
      y: isCreators ? 0.15 : 0,
      z: -2,
      scale: isCreators ? 1.12 : 1.15,
      cameraZ: 5.5,
    }
  }
  // Portrait (phone) keeps the close crop that already fills the stage.
  if (placement !== 'stage' || height >= width) {
    return {
      x: 0,
      y: isCreators ? -0.45 : -0.6,
      z: -3,
      scale: isCreators ? 0.9 : 0.92,
      cameraZ: 6.5,
    }
  }
  // Landscape / desktop stage: center, and size the sphere to most of the height
  // so particles sweep the frame instead of sitting as a small orb off to the side.
  const cameraZ = 5.2
  const z = -1.6
  const depth = cameraZ - z
  const halfH = depth * Math.tan((CAMERA_FOV * Math.PI) / 360)
  const worldR = 0.78 * 2 * halfH
  return { x: 0, y: 0, z, scale: worldR / SPHERE_RADIUS, cameraZ }
}

export function createOrbitalSphereRenderer(
  canvas: HTMLCanvasElement,
  getOptions: () => OrbitalSphereOptions,
) {
  const initial = getOptions()
  const isCreators = initial.variant === 'creators'
  const palette = isCreators ? CREATORS : HARBOR

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const root = new THREE.Group()
  scene.add(root)

  const radius = SPHERE_RADIUS
  const maxParticles = isCreators ? 8_500 : 12_000
  const positions = new Float32Array(maxParticles * 3)
  const colors = new Float32Array(maxParticles * 3)
  const hi = new THREE.Color(palette.particleHi)
  const lo = new THREE.Color(palette.particleLo)
  const fieldCutoff = isCreators ? -0.02 : -0.1

  let count = 0
  for (let i = 0; i < maxParticles; i += 1) {
    const phi = Math.acos(-1 + (2 * i) / maxParticles)
    const theta = Math.sqrt(maxParticles * Math.PI) * phi
    const x = radius * Math.cos(theta) * Math.sin(phi)
    const y = radius * Math.sin(theta) * Math.sin(phi)
    const z = radius * Math.cos(phi)
    const field =
      Math.sin(x * 3.5) * Math.cos(y * 3.5) * Math.sin(z * 3.5) + Math.cos(x * 6) * 0.4
    if (field <= fieldCutoff) continue
    const puff = 1 + field * (isCreators ? 0.08 : 0.1)
    positions[count * 3] = x * puff
    positions[count * 3 + 1] = y * puff
    positions[count * 3 + 2] = z * puff
    const tint = lo.clone().lerp(hi, field > 0.5 ? 1 : isCreators ? 0.5 : 0.35)
    colors[count * 3] = tint.r
    colors[count * 3 + 1] = tint.g
    colors[count * 3 + 2] = tint.b
    count += 1
  }

  const pointsGeo = new THREE.BufferGeometry()
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, count * 3), 3))
  pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors.slice(0, count * 3), 3))
  const pointTex = makeRoundPointTexture()
  const pointsMat = new THREE.PointsMaterial({
    size: initial.particleSize,
    map: pointTex,
    vertexColors: true,
    transparent: true,
    opacity: initial.particleOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  root.add(new THREE.Points(pointsGeo, pointsMat))

  const orbitMat = new THREE.LineBasicMaterial({
    color: palette.orbit,
    transparent: true,
    opacity: initial.orbitOpacity,
    blending: THREE.AdditiveBlending,
  })
  const orbitGeos: THREE.BufferGeometry[] = []
  const nodeGeos: THREE.BufferGeometry[] = []
  const nodeMats: THREE.Material[] = []
  const haloMats: THREE.MeshBasicMaterial[] = []
  const glyphTextures: THREE.CanvasTexture[] = []
  const glyphMats: THREE.SpriteMaterial[] = []
  let layoutScale = 1

  const ringCount = isCreators ? 5 : 6
  let sealIndex = 0
  for (let i = 0; i < ringCount; i += 1) {
    const geo = new THREE.BufferGeometry()
    const pts: number[] = []
    const ringR = radius * (1.08 + Math.random() * 0.2)
    for (let s = 0; s <= 90; s += 1) {
      const a = (s / 90) * Math.PI * 2
      pts.push(Math.cos(a) * ringR, Math.sin(a) * ringR, Math.sin(a * 4) * 0.1)
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    orbitGeos.push(geo)
    const line = new THREE.Line(geo, orbitMat)
    line.rotation.x = Math.random() * Math.PI * 2
    line.rotation.y = Math.random() * Math.PI * 2
    root.add(line)

    if (i % 2 === 0) continue

    const angle = Math.random() * Math.PI * 2
    if (isCreators && sealIndex < CREATORS_SEAL_CHARS.length) {
      const sealChar = CREATORS_SEAL_CHARS[sealIndex]!
      sealIndex += 1
      const sealTex = makeSealTexture(sealChar)
      glyphTextures.push(sealTex)
      const sealMat = new THREE.SpriteMaterial({
        map: sealTex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.NormalBlending,
      })
      glyphMats.push(sealMat)
      const seal = new THREE.Sprite(sealMat)
      seal.scale.set(0.42, 0.42, 1)
      seal.position.set(Math.cos(angle) * ringR, Math.sin(angle) * ringR, 0)
      line.add(seal)
      continue
    }

    const nodeGeo = new THREE.SphereGeometry(0.025, 16, 16)
    const nodeMat = new THREE.MeshBasicMaterial({ color: palette.node })
    const node = new THREE.Mesh(nodeGeo, nodeMat)
    node.position.set(Math.cos(angle) * ringR, Math.sin(angle) * ringR, 0)
    line.add(node)

    const haloGeo = new THREE.SphereGeometry(0.08, 16, 16)
    const haloMat = new THREE.MeshBasicMaterial({
      color: palette.halo,
      transparent: true,
      opacity: initial.haloOpacity,
      blending: THREE.AdditiveBlending,
    })
    const halo = new THREE.Mesh(haloGeo, haloMat)
    node.add(halo)
    nodeGeos.push(nodeGeo, haloGeo)
    nodeMats.push(nodeMat, haloMat)
    haloMats.push(haloMat)
  }

  if (isCreators) {
    // Dense Chao constellation — six tone contours only, no 漢字.
    const glyphCount = 120
    const glyphRadius = radius * 1.14
    for (let i = 0; i < glyphCount; i += 1) {
      const glyph = CREATORS_GLYPHS[i % CREATORS_GLYPHS.length]!
      const fill = 'rgba(180, 214, 198, 0.95)'
      const tex = makeGlyphTexture(glyph, fill)
      glyphTextures.push(tex)
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        blending: THREE.NormalBlending,
      })
      glyphMats.push(mat)
      const sprite = new THREE.Sprite(mat)
      const { x, y, z } = fibonacciPoint(i, glyphCount, glyphRadius)
      sprite.position.set(x, y, z)
      const s = glyph.length > 1 ? 0.24 : 0.27
      sprite.scale.set(s, s, 1)
      root.add(sprite)
    }
  }

  return {
    resize(width: number, height: number) {
      camera.aspect = width / Math.max(1, height)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      const opts = getOptions()
      const layout = resolveOrbitalSphereLayout(width, height, opts.variant, opts.placement)
      root.position.set(layout.x, layout.y, layout.z)
      layoutScale = layout.scale
      camera.position.z = layout.cameraZ
      root.scale.setScalar(layoutScale * opts.scale)
    },
    render() {
      const opts = getOptions()
      pointsMat.size = opts.particleSize
      pointsMat.opacity = opts.particleOpacity
      orbitMat.opacity = opts.orbitOpacity
      for (const mat of haloMats) mat.opacity = opts.haloOpacity
      root.scale.setScalar(layoutScale * opts.scale)
      root.rotation.y += 0.0008 * opts.speed
      root.rotation.x += 0.0003 * opts.speed
      root.children.forEach((child, index) => {
        if (child instanceof THREE.Line) {
          child.rotation.z += 0.0004 * opts.speed * (index % 2 === 0 ? 1 : -1)
        }
      })
      renderer.render(scene, camera)
    },
    dispose() {
      pointsGeo.dispose()
      pointsMat.dispose()
      pointTex.dispose()
      orbitMat.dispose()
      orbitGeos.forEach((g) => g.dispose())
      nodeGeos.forEach((g) => g.dispose())
      nodeMats.forEach((m) => m.dispose())
      glyphMats.forEach((m) => m.dispose())
      glyphTextures.forEach((t) => t.dispose())
      renderer.dispose()
    },
  }
}
