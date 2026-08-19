import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useTheme } from '../lib/theme'

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vLocal;

uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  v += a * noise(p); p *= 2.01; a *= 0.5;
  v += a * noise(p); p *= 2.03; a *= 0.5;
  v += a * noise(p);
  return v;
}

void main() {
  vUv = uv;
  vec3 p = position;
  float t = uTime * 0.08;
  float waves = fbm(uv * 3.5 + vec2(t * 0.35, t * 0.22)) - 0.46;
  p.z += waves * 0.32;
  vLocal = p;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
}
`

const FRAG = /* glsl */ `
varying vec2 vUv;
varying vec3 vLocal;

uniform vec3 uHarbor;
uniform vec3 uCool;
uniform vec3 uJade;
uniform vec3 uMint;
uniform float uOpacity;

void main() {
  float ridge = smoothstep(0.0, 0.42, vLocal.z + 0.08);
  vec3 col = mix(uHarbor, uCool, clamp(vUv.x * 0.35 + vUv.y * 0.28, 0.0, 1.0));
  col = mix(col, uJade, ridge * 0.48);
  col = mix(col, uMint, ridge * ridge * 0.18);

  float edge = smoothstep(0.0, 0.22, vUv.x)
    * smoothstep(0.0, 0.22, vUv.y)
    * smoothstep(1.0, 0.78, vUv.x)
    * smoothstep(1.0, 0.78, vUv.y);
  float alpha = uOpacity * mix(0.55, 1.0, ridge) * mix(0.3, 1.0, edge);
  gl_FragColor = vec4(col, alpha);
}
`

function fitOrtho(cam: THREE.OrthographicCamera, w: number, h: number) {
  const aspect = w / Math.max(h, 1)
  const halfH = 2.8
  cam.left = -halfH * aspect
  cam.right = halfH * aspect
  cam.top = halfH
  cam.bottom = -halfH
  cam.updateProjectionMatrix()
}

/**
 * Fluid grid background for the homepage demo section.
 * Quiet drifting folds in harbor/jade. No interactivity needed —
 * just atmosphere behind the demo card.
 */
export function DemoFluidGrid() {
  const mountRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { theme } = useTheme()

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = Math.max(mount.clientWidth, 1)
    const height = Math.max(mount.clientHeight, 1)
    const light = theme === 'light'

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.NoToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40)
    camera.position.set(0, 0.3, 8)
    camera.lookAt(0, 0, 0)
    fitOrtho(camera, width, height)

    const uniforms = {
      uTime: { value: reduced ? 4 : 0 },
      uHarbor: { value: new THREE.Color(light ? '#d7e6ee' : '#0a1c2c') },
      uCool: { value: new THREE.Color(light ? '#b7d4e8' : '#12324a') },
      uJade: { value: new THREE.Color(light ? '#1f9f8a' : '#3dcfb6') },
      uMint: { value: new THREE.Color(light ? '#5ecfb8' : '#7ef0dc') },
      uOpacity: { value: light ? 0.28 : 0.32 },
    }

    const geo = new THREE.PlaneGeometry(18, 10, 56, 36)
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    })
    const cloth = new THREE.Mesh(geo, mat)
    cloth.rotation.x = -0.38
    cloth.position.set(0, -0.15, 0)
    scene.add(cloth)

    const resize = () => {
      const w = Math.max(mount.clientWidth, 1)
      const h = Math.max(mount.clientHeight, 1)
      renderer.setSize(w, h)
      fitOrtho(camera, w, h)
    }
    window.addEventListener('resize', resize)

    let raf = 0
    let running = false
    let inView = true
    let lastDraw = 0
    const t0 = performance.now()
    const frameMs = 33

    const renderFrame = (now = performance.now()) => {
      if (!reduced) uniforms.uTime.value = (now - t0) / 1000
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
      if (document.hidden) stopLoop()
      else {
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
      document.removeEventListener('visibilitychange', onVisibility)
      geo.dispose()
      mat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [reduced, theme])

  return <div ref={mountRef} className="demo-fluid-grid" aria-hidden="true" />
}
