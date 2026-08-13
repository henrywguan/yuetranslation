import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useTheme } from '../lib/theme'

/** Glass iridescent bubble cluster for the hero — theme-aware jade/ink sheen. */
export function HeroObject() {
  const mountRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { theme } = useTheme()

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth
    const height = mount.clientHeight
    const light = theme === 'light'

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
    camera.position.z = 5.2

    const group = new THREE.Group()
    scene.add(group)

    const jade = new THREE.Color(light ? '#1f9f8a' : '#3dcfb6')
    const ink = new THREE.Color(light ? '#4a7a9a' : '#e8f4ff')
    const deep = new THREE.Color(light ? '#0f6b5d' : '#1f8f7a')

    const bubbles: THREE.Mesh[] = []
    const specs: { r: number; pos: THREE.Vector3; speed: number }[] = [
      { r: 1.15, pos: new THREE.Vector3(0.15, 0.1, 0), speed: 0.16 },
      { r: 0.55, pos: new THREE.Vector3(-1.35, 0.65, 0.4), speed: 0.22 },
      { r: 0.42, pos: new THREE.Vector3(1.2, -0.55, 0.55), speed: 0.28 },
      { r: 0.28, pos: new THREE.Vector3(0.85, 0.95, -0.2), speed: 0.34 },
    ]

    for (const s of specs) {
      const geo = new THREE.SphereGeometry(s.r, 48, 48)
      const mat = new THREE.MeshPhysicalMaterial({
        color: jade,
        metalness: 0.18,
        roughness: 0.12,
        transparent: true,
        opacity: light ? 0.42 : 0.38,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        sheen: 1,
        sheenRoughness: 0.35,
        sheenColor: ink,
        emissive: deep,
        emissiveIntensity: light ? 0.08 : 0.18,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(s.pos)
      group.add(mesh)
      bubbles.push(mesh)
    }

    const count = 160
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 1.8 + Math.random() * 2.2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const points = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: jade,
        size: 0.028,
        transparent: true,
        opacity: light ? 0.45 : 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    scene.add(points)

    const key = new THREE.DirectionalLight(0xffffff, light ? 1.1 : 0.85)
    key.position.set(-2.5, 3.5, 4)
    scene.add(key)
    scene.add(new THREE.AmbientLight(light ? 0xd8e8f0 : 0x1a3040, light ? 0.85 : 0.55))
    const fill = new THREE.PointLight(jade.getHex(), light ? 0.55 : 0.9, 12)
    fill.position.set(2, -1, 3)
    scene.add(fill)

    const pointer = { x: 0, y: 0 }
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    if (!reduced) window.addEventListener('pointermove', onPointer)

    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', resize)

    let raf = 0
    const clock = new THREE.Clock()

    const renderFrame = () => {
      const t = clock.getElapsedTime()
      group.rotation.y = t * 0.12 + pointer.x * 0.2
      group.rotation.x = Math.sin(t * 0.25) * 0.12 + pointer.y * 0.12
      bubbles.forEach((mesh, i) => {
        const s = specs[i]
        mesh.position.y = s.pos.y + Math.sin(t * s.speed * 4 + i) * 0.08
        mesh.position.x = s.pos.x + Math.cos(t * s.speed * 3 + i) * 0.05
      })
      points.rotation.y = -t * 0.04
      renderer.render(scene, camera)
    }

    let running = true
    const loop = () => {
      if (!running) return
      renderFrame()
      raf = requestAnimationFrame(loop)
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!reduced && !running) {
        running = true
        loop()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    if (reduced) renderFrame()
    else loop()

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
      bubbles.forEach((mesh) => {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      })
      pGeo.dispose()
      ;(points.material as THREE.Material).dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [reduced, theme])

  return <div ref={mountRef} className="hero-object" aria-hidden="true" />
}
