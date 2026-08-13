import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useTheme } from '../lib/theme'

const BUBBLE_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`

const BUBBLE_FRAG = /* glsl */ `
uniform vec3 uJade;
uniform vec3 uDeep;
uniform vec3 uCool;
uniform float uLight;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 2.4);

  // jade volume → cool harbor rim
  vec3 col = mix(uDeep, uJade, 0.55 + 0.35 * n.y);
  col = mix(col, uCool, fres * 0.85);

  // crescent highlight
  vec3 l = normalize(vec3(-0.35, 0.8, 0.45));
  float spec = pow(max(dot(reflect(-l, n), v), 0.0), 48.0);
  col += vec3(0.9, 0.96, 1.0) * spec * 0.75;
  col += uJade * fres * 0.25;

  float alpha = mix(0.18, 0.55, fres) + spec * 0.2;
  alpha *= mix(0.95, 0.75, uLight);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.82));
}
`

/** Elegant jade-glass bubble cluster for the hero. */
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.z = 5.4

    const group = new THREE.Group()
    scene.add(group)

    const jade = new THREE.Color(light ? '#1f9f8a' : '#3dcfb6')
    const deep = new THREE.Color(light ? '#0f6b5d' : '#147a6a')
    const cool = new THREE.Color(light ? '#6a93a8' : '#8eb6c9')

    const bubbles: THREE.Mesh[] = []
    const specs = [
      { r: 1.25, pos: new THREE.Vector3(0.35, 0.05, 0), speed: 0.12 },
      { r: 0.48, pos: new THREE.Vector3(-1.15, 0.55, 0.5), speed: 0.18 },
      { r: 0.36, pos: new THREE.Vector3(1.05, -0.5, 0.6), speed: 0.22 },
      { r: 0.22, pos: new THREE.Vector3(-0.35, -0.75, 0.3), speed: 0.26 },
    ]

    for (const s of specs) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: BUBBLE_VERT,
        fragmentShader: BUBBLE_FRAG,
        uniforms: {
          uJade: { value: jade },
          uDeep: { value: deep },
          uCool: { value: cool },
          uLight: { value: light ? 1 : 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(s.r, 64, 64), mat)
      mesh.position.copy(s.pos)
      group.add(mesh)
      bubbles.push(mesh)
    }

    // Soft back glow disc (sprite-like plane)
    const glowGeo = new THREE.SphereGeometry(1.6, 32, 32)
    const glowMat = new THREE.MeshBasicMaterial({
      color: jade,
      transparent: true,
      opacity: light ? 0.06 : 0.1,
      depthWrite: false,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.set(0.35, 0.05, -0.8)
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
    const clock = new THREE.Clock()

    const renderFrame = () => {
      const t = clock.getElapsedTime()
      group.rotation.y = t * 0.08 + pointer.x * 0.15
      group.rotation.x = Math.sin(t * 0.2) * 0.08 + pointer.y * 0.1
      bubbles.forEach((mesh, i) => {
        const s = specs[i]
        mesh.position.y = s.pos.y + Math.sin(t * s.speed * 3.5 + i) * 0.06
        mesh.position.x = s.pos.x + Math.cos(t * s.speed * 2.8 + i) * 0.04
      })
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
      glowGeo.dispose()
      glowMat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [reduced, theme])

  return <div ref={mountRef} className="hero-object" aria-hidden="true" />
}
