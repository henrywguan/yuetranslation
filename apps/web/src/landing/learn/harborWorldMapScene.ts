/**
 * Harbor Quest · wuxia world-map diorama (Learning voyage ↔ Guan Harbor).
 *
 * Procedural two-continent relief with the painted Harbor World parchment as a
 * floating backdrop. Hover / tap either continent for jade or gold glow.
 */
import * as THREE from 'three'
import { GUAN_HARBOR_META } from './harborGuanRealm'
import { loadHarborGlb } from './harborGlbAssets'

export const HARBOR_WORLD_MAP_ART = '/assets/harbor-quest/world-map/harbor-world-map.png'
export const HARBOR_WORLD_MAP_GLB = '/assets/harbor-quest/world-map/harbor-world-map.glb'

export type HarborWorldMapDest = 'voyage' | 'guan'

type Continent = {
  id: HarborWorldMapDest
  group: THREE.Group
  mats: THREE.MeshStandardMaterial[]
  baseEmissive: THREE.Color
  glowEmissive: THREE.Color
  label: { en: string; zh: string }
}

function islandShape(seed: number, lobes: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape()
  const steps = 28
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const wobble =
      0.72 +
      0.18 * Math.sin(t * lobes + seed) +
      0.1 * Math.cos(t * (lobes + 2) - seed * 0.7)
    const x = Math.cos(t) * radius * wobble
    const y = Math.sin(t) * radius * wobble * 0.78
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

function makeContinentMesh(
  id: HarborWorldMapDest,
  opts: {
    x: number
    z: number
    color: number
    rock: number
    seed: number
    lobes: number
    radius: number
    glow: number
  },
): Continent {
  const group = new THREE.Group()
  group.name = `worldmap-${id}`
  group.position.set(opts.x, 0.08, opts.z)
  group.userData.worldMapDest = id

  const shape = islandShape(opts.seed, opts.lobes, opts.radius)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.55,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.1,
    bevelSegments: 2,
    curveSegments: 12,
  })
  geo.rotateX(-Math.PI / 2)
  // Center the extruded footprint.
  geo.computeBoundingBox()
  const box = geo.boundingBox!
  const mid = new THREE.Vector3()
  box.getCenter(mid)
  geo.translate(-mid.x, -box.min.y, -mid.z)

  const landMat = new THREE.MeshStandardMaterial({
    color: opts.color,
    roughness: 0.78,
    metalness: 0.08,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
  })
  const land = new THREE.Mesh(geo, landMat)
  land.castShadow = false
  land.receiveShadow = true
  land.userData.worldMapDest = id
  group.add(land)

  // Soft ridge / hill caps
  const hillMat = new THREE.MeshStandardMaterial({
    color: opts.rock,
    roughness: 0.85,
    metalness: 0.04,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
  })
  for (let i = 0; i < 3; i++) {
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(opts.radius * (0.22 - i * 0.04), 10, 8),
      hillMat,
    )
    hill.scale.set(1.2, 0.45, 1)
    hill.position.set(
      Math.cos(opts.seed + i * 2.1) * opts.radius * 0.28,
      0.35 + i * 0.08,
      Math.sin(opts.seed + i * 1.7) * opts.radius * 0.22,
    )
    hill.userData.worldMapDest = id
    group.add(hill)
  }

  const glow = new THREE.Color(opts.glow)
  return {
    id,
    group,
    mats: [landMat, hillMat],
    baseEmissive: new THREE.Color(0x000000),
    glowEmissive: glow,
    label:
      id === 'voyage'
        ? { en: 'Learning voyage', zh: '學習航線' }
        : { en: GUAN_HARBOR_META.en, zh: GUAN_HARBOR_META.zh },
  }
}

function setContinentGlow(c: Continent, on: boolean, strength = 1) {
  for (const mat of c.mats) {
    if (on) {
      mat.emissive.copy(c.glowEmissive)
      mat.emissiveIntensity = 0.55 * strength
    } else {
      mat.emissive.copy(c.baseEmissive)
      mat.emissiveIntensity = 0
    }
    mat.needsUpdate = true
  }
  // Soft rim halo under the island
  const halo = c.group.getObjectByName('halo') as THREE.Mesh | undefined
  if (halo) {
    const m = halo.material as THREE.MeshBasicMaterial
    m.opacity = on ? 0.42 * strength : 0.12
  }
}

export type HarborWorldMapScene = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  continents: Continent[]
  dispose: () => void
  setHover: (id: HarborWorldMapDest | null) => void
  pick: (clientX: number, clientY: number, el: HTMLElement) => HarborWorldMapDest | null
  tick: (t: number) => void
}

export async function createHarborWorldMapScene(
  canvas: HTMLCanvasElement,
): Promise<HarborWorldMapScene> {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x0a2030, 0.035)

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80)
  camera.position.set(0, 7.2, 9.4)
  camera.lookAt(0, 0.4, 0)

  const hemi = new THREE.HemisphereLight(0xc8e8ff, 0x1a3020, 1.05)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xfff0d8, 1.15)
  key.position.set(-4, 8, 5)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x7ec8b8, 0.45)
  rim.position.set(5, 3, -4)
  scene.add(rim)

  // Ocean disc
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x1a5a78,
    roughness: 0.35,
    metalness: 0.15,
    transparent: true,
    opacity: 0.92,
  })
  const ocean = new THREE.Mesh(new THREE.CircleGeometry(7.2, 64), oceanMat)
  ocean.rotation.x = -Math.PI / 2
  ocean.position.y = 0
  scene.add(ocean)

  // Soft mist ring
  const mist = new THREE.Mesh(
    new THREE.RingGeometry(5.2, 7.4, 64),
    new THREE.MeshBasicMaterial({
      color: 0x9fd8e8,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  mist.rotation.x = -Math.PI / 2
  mist.position.y = 0.02
  scene.add(mist)

  const voyage = makeContinentMesh('voyage', {
    x: -2.35,
    z: 0.15,
    color: 0x3d8f6a,
    rock: 0x2a6a4e,
    seed: 1.2,
    lobes: 5,
    radius: 1.85,
    glow: 0x3dcfb6,
  })
  const guan = makeContinentMesh('guan', {
    x: 2.45,
    z: -0.1,
    color: 0xc4a060,
    rock: 0x8a5a38,
    seed: 2.4,
    lobes: 4,
    radius: 1.75,
    glow: 0xe2c56a,
  })

  for (const c of [voyage, guan]) {
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(c.id === 'voyage' ? 2.15 : 2.05, 32),
      new THREE.MeshBasicMaterial({
        color: c.glowEmissive,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
    )
    halo.name = 'halo'
    halo.rotation.x = -Math.PI / 2
    halo.position.y = 0.04
    c.group.add(halo)
    scene.add(c.group)
  }

  // Painted parchment backdrop (MapleStory-like illustrated map)
  const texLoader = new THREE.TextureLoader()
  const mapTex = await new Promise<THREE.Texture>((resolve, reject) => {
    texLoader.load(
      HARBOR_WORLD_MAP_ART,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 4
        resolve(t)
      },
      undefined,
      reject,
    )
  }).catch(() => null)

  if (mapTex) {
    const parchment = new THREE.Mesh(
      new THREE.PlaneGeometry(10.2, 5.75),
      new THREE.MeshBasicMaterial({
        map: mapTex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    )
    parchment.position.set(0, 3.35, -3.4)
    parchment.rotation.x = -0.18
    scene.add(parchment)
  }

  // Higgsfield SAM 3D relief of the painted chart (decorative backdrop model)
  const relief = await loadHarborGlb(HARBOR_WORLD_MAP_GLB, {
    targetHeight: 3.4,
    celShade: false,
    plantOnGround: true,
    name: 'harbor-world-map-relief',
  })
  if (relief) {
    relief.position.set(0, 0.15, -1.1)
    relief.rotation.x = -0.55
    relief.scale.multiplyScalar(1.15)
    relief.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = false
      m.receiveShadow = true
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats) {
        if (mat && 'transparent' in mat) {
          ;(mat as THREE.MeshStandardMaterial).transparent = true
          ;(mat as THREE.MeshStandardMaterial).opacity = 0.92
        }
      }
    })
    scene.add(relief)
  }

  const continents = [voyage, guan]
  let hover: HarborWorldMapDest | null = null
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  const pick = (clientX: number, clientY: number, el: HTMLElement): HarborWorldMapDest | null => {
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(
      continents.flatMap((c) => c.group.children),
      true,
    )
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object
      while (o) {
        const id = o.userData.worldMapDest as HarborWorldMapDest | undefined
        if (id === 'voyage' || id === 'guan') return id
        o = o.parent
      }
    }
    // Fallback: screen-space left / right when missing a mesh hit (mobile slop).
    const nx = (clientX - rect.left) / rect.width
    if (nx < 0.42) return 'voyage'
    if (nx > 0.58) return 'guan'
    return null
  }

  const setHover = (id: HarborWorldMapDest | null) => {
    hover = id
    for (const c of continents) setContinentGlow(c, c.id === id, 1)
  }

  const tick = (t: number) => {
    const bob = Math.sin(t * 0.0011) * 0.04
    voyage.group.position.y = 0.08 + bob
    guan.group.position.y = 0.08 - bob * 0.85
    voyage.group.rotation.y = Math.sin(t * 0.00035) * 0.04
    guan.group.rotation.y = Math.cos(t * 0.0004) * 0.04
    mist.rotation.z = t * 0.00008
    if (hover) {
      const pulse = 0.85 + 0.15 * Math.sin(t * 0.006)
      const c = continents.find((x) => x.id === hover)
      if (c) setContinentGlow(c, true, pulse)
    }
  }

  const dispose = () => {
    renderer.dispose()
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.geometry?.dispose()
      const mat = m.material
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else (mat as THREE.Material | undefined)?.dispose?.()
    })
  }

  return { renderer, scene, camera, continents, dispose, setHover, pick, tick }
}
