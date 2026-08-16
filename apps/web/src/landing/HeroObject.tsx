import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useTheme } from '../lib/theme'

/**
 * Precious jade-glass hero bubbles with real transmission / refraction
 * via MeshPhysicalMaterial + PMREM RoomEnvironment.
 *
 * Perf notes: only the hero orb uses full transmission; satellites are cheaper
 * glass. RAF pauses when offscreen / tab hidden and is capped ~30fps.
 */
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

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      // Headless / no-GPU environments (docs screenshots, some CI) — skip 3D hero.
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = light ? 1.05 : 0.92
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100)
    camera.position.set(0, 0.1, 5.6)

    // Studio environment for real refraction / reflections
    const pmrem = new THREE.PMREMGenerator(renderer)
    pmrem.compileEquirectangularShader()
    const envScene = new RoomEnvironment()
    const envTex = pmrem.fromScene(envScene, 0.04).texture
    scene.environment = envTex
    scene.environmentIntensity = light ? 0.85 : 1.15

    const group = new THREE.Group()
    scene.add(group)

    const jade = new THREE.Color(light ? '#5ecfb8' : '#6ad9c4')
    const cool = new THREE.Color(light ? '#a8c5d4' : '#1a3040')

    // Soft colored backdrop so refraction has something beautiful to bend
    const back = new THREE.Mesh(
      new THREE.SphereGeometry(8, 24, 24),
      new THREE.MeshBasicMaterial({
        color: cool,
        side: THREE.BackSide,
        transparent: true,
        opacity: light ? 0.35 : 0.55,
      }),
    )
    scene.add(back)

    // Structured light panels behind glass — transmission needs contrast to read
    const panelMats: THREE.Material[] = []
    const panels = new THREE.Group()
    panels.position.z = -1.35
    const panelSpecs = [
      { w: 2.6, h: 0.32, x: -0.55, y: 0.85, color: light ? '#2ab89d' : '#3dcfb6', op: light ? 0.7 : 0.75 },
      { w: 2.0, h: 0.26, x: 0.9, y: 0.1, color: light ? '#7eb8d0' : '#5eb0d0', op: light ? 0.65 : 0.7 },
      { w: 2.3, h: 0.3, x: -0.15, y: -0.7, color: light ? '#147a6a' : '#1a9f88', op: light ? 0.55 : 0.65 },
      { w: 1.0, h: 1.8, x: 1.45, y: 0.15, color: light ? '#b8d4e4' : '#2a5060', op: light ? 0.5 : 0.55 },
      { w: 0.35, h: 2.2, x: -1.1, y: 0.0, color: light ? '#e8f6f2' : '#9af0de', op: light ? 0.55 : 0.45 },
    ]
    for (const p of panelSpecs) {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(p.color),
        transparent: true,
        opacity: p.op,
        depthWrite: false,
      })
      panelMats.push(mat)
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), mat)
      mesh.position.set(p.x, p.y, 0)
      panels.add(mesh)
    }
    group.add(panels)

    const key = new THREE.DirectionalLight(0xffffff, light ? 1.4 : 1.1)
    key.position.set(-3, 4, 5)
    scene.add(key)
    const fill = new THREE.PointLight(jade.getHex(), light ? 0.7 : 1.1, 16)
    fill.position.set(2.5, -0.5, 3.5)
    scene.add(fill)
    const rim = new THREE.PointLight(0xb8d4e8, light ? 0.4 : 0.65, 14)
    rim.position.set(-2, 1.5, -2)
    scene.add(rim)
    scene.add(new THREE.AmbientLight(light ? 0xd8e8f0 : 0x0c1c28, light ? 0.45 : 0.25))

    const bubbles: THREE.Mesh[] = []
    const specs = [
      { r: 1.2, pos: new THREE.Vector3(0.4, 0.05, 0), speed: 0.1, transmit: true, segs: 48 },
      { r: 0.5, pos: new THREE.Vector3(-1.2, 0.55, 0.55), speed: 0.16, transmit: false, segs: 28 },
      { r: 0.38, pos: new THREE.Vector3(1.15, -0.48, 0.65), speed: 0.2, transmit: false, segs: 24 },
      { r: 0.24, pos: new THREE.Vector3(-0.4, -0.72, 0.35), speed: 0.24, transmit: false, segs: 20 },
    ]

    for (const s of specs) {
      const mat = s.transmit
        ? new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#f4fffc'),
            metalness: 0,
            roughness: 0.02,
            transmission: 1,
            thickness: 1.65,
            ior: 1.48,
            transparent: true,
            opacity: 1,
            clearcoat: 1,
            clearcoatRoughness: 0.04,
            attenuationColor: new THREE.Color(light ? '#3dcfb6' : '#2ab89d'),
            attenuationDistance: light ? 5.5 : 4.2,
            specularIntensity: 1,
            envMapIntensity: light ? 1.4 : 1.85,
            sheen: 0.12,
            sheenRoughness: 0.28,
            sheenColor: jade,
          })
        : new THREE.MeshPhysicalMaterial({
            // Satellites: reflective glass shell without transmission (big GPU save).
            color: new THREE.Color('#eefaf7'),
            metalness: 0,
            roughness: 0.08,
            transmission: 0,
            transparent: true,
            opacity: light ? 0.55 : 0.62,
            clearcoat: 0.85,
            clearcoatRoughness: 0.08,
            envMapIntensity: light ? 1.1 : 1.4,
            depthWrite: false,
          })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(s.r, s.segs, s.segs), mat)
      mesh.position.copy(s.pos)
      group.add(mesh)
      bubbles.push(mesh)
    }

    // Soft jade bloom sphere behind hero bubble (caught by refraction)
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 24, 24),
      new THREE.MeshBasicMaterial({
        color: jade,
        transparent: true,
        opacity: light ? 0.1 : 0.16,
        depthWrite: false,
      }),
    )
    glow.position.set(0.4, 0.05, -1.1)
    group.add(glow)

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
    let running = false
    let inView = true
    let lastDraw = 0
    const t0 = performance.now()
    const frameMs = 33

    const renderFrame = (now = performance.now()) => {
      const t = (now - t0) / 1000
      group.rotation.y = t * 0.07 + pointer.x * 0.14
      group.rotation.x = Math.sin(t * 0.18) * 0.07 + pointer.y * 0.09
      bubbles.forEach((mesh, i) => {
        const s = specs[i]
        mesh.position.y = s.pos.y + Math.sin(t * s.speed * 3.2 + i) * 0.05
        mesh.position.x = s.pos.x + Math.cos(t * s.speed * 2.6 + i) * 0.035
      })
      back.rotation.y = t * 0.02
      panels.rotation.z = Math.sin(t * 0.12) * 0.04
      panels.position.x = Math.sin(t * 0.08) * 0.08
      renderer.render(scene, camera)
    }

    const loop = (now: number) => {
      if (!running) return
      if (now - lastDraw >= frameMs) {
        lastDraw = now
        renderFrame(now)
      }
      raf = requestAnimationFrame(loop)
    }

    const startLoop = () => {
      if (reduced || document.hidden || !inView || running) return
      running = true
      lastDraw = 0
      raf = requestAnimationFrame(loop)
    }

    const stopLoop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const onVisibility = () => {
      if (document.hidden) {
        stopLoop()
      } else {
        startLoop()
        if (!running) renderFrame()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            ([entry]) => {
              inView = entry.isIntersecting && entry.intersectionRatio > 0.05
              if (inView) startLoop()
              else {
                stopLoop()
                renderFrame()
              }
            },
            { threshold: [0, 0.05, 0.2] },
          )
        : null
    io?.observe(mount)

    if (reduced) renderFrame()
    else startLoop()

    return () => {
      stopLoop()
      io?.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
      bubbles.forEach((mesh) => {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      })
      glow.geometry.dispose()
      ;(glow.material as THREE.Material).dispose()
      back.geometry.dispose()
      ;(back.material as THREE.Material).dispose()
      panels.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
        }
      })
      panelMats.forEach((m) => m.dispose())
      envTex.dispose()
      envScene.dispose()
      pmrem.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [reduced, theme])

  return <div ref={mountRef} className="hero-object" aria-hidden="true" />
}
