import * as THREE from 'three'

export type OrbitalSphereOptions = {
  speed: number
  particleSize: number
  particleOpacity: number
  orbitOpacity: number
  scale: number
  haloOpacity: number
  /** CSS hue-rotate degrees applied by the host canvas filter. */
  hue: number
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
}

/** Jade bright / deep — matches --jade-bright / deep harbor teal. */
const PARTICLE_HI = 0x7aebd4
const PARTICLE_LO = 0x1a6b5c
const ORBIT_COLOR = 0x3dcfb6
const NODE_COLOR = 0xb8ead0
const HALO_COLOR = 0x3dcfb6

export function createOrbitalSphereRenderer(
  canvas: HTMLCanvasElement,
  getOptions: () => OrbitalSphereOptions,
) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const root = new THREE.Group()
  scene.add(root)

  const radius = 2.2
  const maxParticles = 12_000
  const positions = new Float32Array(maxParticles * 3)
  const colors = new Float32Array(maxParticles * 3)
  const hi = new THREE.Color(PARTICLE_HI)
  const lo = new THREE.Color(PARTICLE_LO)

  let count = 0
  for (let i = 0; i < maxParticles; i += 1) {
    const phi = Math.acos(-1 + (2 * i) / maxParticles)
    const theta = Math.sqrt(maxParticles * Math.PI) * phi
    const x = radius * Math.cos(theta) * Math.sin(phi)
    const y = radius * Math.sin(theta) * Math.sin(phi)
    const z = radius * Math.cos(phi)
    const field =
      Math.sin(x * 3.5) * Math.cos(y * 3.5) * Math.sin(z * 3.5) + Math.cos(x * 6) * 0.4
    if (field <= -0.1) continue
    const puff = 1 + field * 0.1
    positions[count * 3] = x * puff
    positions[count * 3 + 1] = y * puff
    positions[count * 3 + 2] = z * puff
    const tint = lo.clone().lerp(hi, field > 0.5 ? 1 : 0.35)
    colors[count * 3] = tint.r
    colors[count * 3 + 1] = tint.g
    colors[count * 3 + 2] = tint.b
    count += 1
  }

  const pointsGeo = new THREE.BufferGeometry()
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, count * 3), 3))
  pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors.slice(0, count * 3), 3))
  const pointsMat = new THREE.PointsMaterial({
    size: 0.015,
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  root.add(new THREE.Points(pointsGeo, pointsMat))

  const orbitMat = new THREE.LineBasicMaterial({
    color: ORBIT_COLOR,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
  })
  const orbitGeos: THREE.BufferGeometry[] = []
  const nodeGeos: THREE.BufferGeometry[] = []
  const nodeMats: THREE.Material[] = []
  const haloMats: THREE.MeshBasicMaterial[] = []
  let layoutScale = 1

  for (let i = 0; i < 6; i += 1) {
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

    if (i % 2 !== 0) {
      const nodeGeo = new THREE.SphereGeometry(0.025, 16, 16)
      const nodeMat = new THREE.MeshBasicMaterial({ color: NODE_COLOR })
      const node = new THREE.Mesh(nodeGeo, nodeMat)
      const angle = Math.random() * Math.PI * 2
      node.position.set(Math.cos(angle) * ringR, Math.sin(angle) * ringR, 0)
      line.add(node)

      const haloGeo = new THREE.SphereGeometry(0.08, 16, 16)
      const haloMat = new THREE.MeshBasicMaterial({
        color: HALO_COLOR,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
      })
      const halo = new THREE.Mesh(haloGeo, haloMat)
      node.add(halo)
      nodeGeos.push(nodeGeo, haloGeo)
      nodeMats.push(nodeMat, haloMat)
      haloMats.push(haloMat)
    }
  }

  return {
    resize(width: number, height: number) {
      camera.aspect = width / Math.max(1, height)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      const opts = getOptions()
      if (width >= 1024) {
        root.position.set(2.5, 0, -2)
        layoutScale = 1.15
        camera.position.z = 5.5
      } else {
        root.position.set(0, -0.6, -3)
        layoutScale = 0.92
        camera.position.z = 6.5
      }
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
      orbitMat.dispose()
      orbitGeos.forEach((g) => g.dispose())
      nodeGeos.forEach((g) => g.dispose())
      nodeMats.forEach((m) => m.dispose())
      renderer.dispose()
    },
  }
}
