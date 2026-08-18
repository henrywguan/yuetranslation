import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useTheme } from '../lib/theme'

const VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vLocal;
varying vec2 vUv;

uniform float uTime;
uniform vec2 uPointer;
uniform float uAmp;

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
  v += a * noise(p); p *= 2.03; a *= 0.5;
  v += a * noise(p); p *= 2.01; a *= 0.5;
  v += a * noise(p); p *= 2.02; a *= 0.5;
  v += a * noise(p);
  return v;
}

void main() {
  vUv = uv;
  vec3 p = position;
  float t = uTime * 0.11;
  float waves = fbm(uv * 3.15 + vec2(t * 0.32, t * 0.2)) - 0.48;
  vec2 hit = uPointer * 0.5 + 0.5;
  vec2 d = uv - hit;
  float dent = exp(-dot(d, d) * 8.5) * 0.46;
  p.z += (waves * 0.58 + dent) * uAmp;
  vLocal = p;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const FRAG = /* glsl */ `
varying vec3 vWorld;
varying vec3 vLocal;
varying vec2 vUv;

uniform vec3 uHarbor;
uniform vec3 uCool;
uniform vec3 uJade;
uniform vec3 uMint;
uniform float uOpacity;

void main() {
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float wrap = 0.58 + 0.42 * dot(n, normalize(vec3(-0.32, 0.72, 0.58)));
  float ridge = smoothstep(0.04, 0.52, vLocal.z + 0.12);

  vec3 col = mix(uHarbor, uCool, clamp(vUv.x * 0.42 + vUv.y * 0.22, 0.0, 1.0));
  col = mix(col, uJade, ridge * 0.7);
  col = mix(col, uMint, ridge * ridge * 0.26);
  col *= mix(0.84, 1.07, wrap);

  float edge = smoothstep(0.0, 0.14, vUv.x)
    * smoothstep(0.0, 0.16, vUv.y)
    * smoothstep(1.0, 0.86, vUv.x)
    * smoothstep(1.0, 0.82, vUv.y);
  float alpha = uOpacity * mix(0.72, 1.0, ridge) * mix(0.4, 1.0, edge);
  gl_FragColor = vec4(col, alpha);
}
`

function fitOrtho(cam: THREE.OrthographicCamera, w: number, h: number) {
  const aspect = w / Math.max(h, 1)
  const halfH = 3.35
  cam.left = -halfH * aspect
  cam.right = halfH * aspect
  cam.top = halfH
  cam.bottom = -halfH
  cam.updateProjectionMatrix()
}

/**
 * Harbor cloth — a quiet tilted gradient mesh behind the hero.
 * Soft folds + a pointer dent. No transmission / refraction.
 * RAF pauses when offscreen / tab hidden and is capped ~30fps.
 */
export function HeroObject() {
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
      // Headless / no-GPU environments (docs screenshots, some CI) — skip 3D hero.
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.NoToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40)
    camera.position.set(0, 0.55, 8)
    camera.lookAt(0, 0, 0)
    fitOrtho(camera, width, height)

    const uniforms = {
      uTime: { value: reduced ? 3.8 : 0 },
      uPointer: { value: new THREE.Vector2(0.12, -0.08) },
      uAmp: { value: reduced ? 0.82 : 1 },
      uHarbor: { value: new THREE.Color(light ? '#d7e6ee' : '#07131f') },
      uCool: { value: new THREE.Color(light ? '#b7d4e8' : '#12324a') },
      uJade: { value: new THREE.Color(light ? '#1f9f8a' : '#3dcfb6') },
      uMint: { value: new THREE.Color(light ? '#5ecfb8' : '#9af0de') },
      uOpacity: { value: light ? 0.38 : 0.46 },
    }

    const geo = new THREE.PlaneGeometry(22, 13, 72, 48)
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    })
    const cloth = new THREE.Mesh(geo, mat)
    cloth.rotation.x = -0.52
    cloth.position.set(0.15, -0.2, 0)
    scene.add(cloth)

    const pointer = { x: 0.12, y: -0.08 }
    const pointerSmoothed = { x: 0.12, y: -0.08 }
    const onPointer = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect()
      const w = Math.max(r.width, 1)
      const h = Math.max(r.height, 1)
      pointer.x = ((e.clientX - r.left) / w) * 2 - 1
      pointer.y = -((e.clientY - r.top) / h) * 2 + 1
    }
    if (!reduced) window.addEventListener('pointermove', onPointer)

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
      const t = (now - t0) / 1000
      if (!reduced) {
        pointerSmoothed.x += (pointer.x - pointerSmoothed.x) * 0.055
        pointerSmoothed.y += (pointer.y - pointerSmoothed.y) * 0.055
        uniforms.uTime.value = t
        uniforms.uPointer.value.set(pointerSmoothed.x, pointerSmoothed.y)
        cloth.rotation.z = Math.sin(t * 0.07) * 0.03
        cloth.position.x = 0.15 + pointerSmoothed.x * 0.12
      }
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
      geo.dispose()
      mat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [reduced, theme])

  return <div ref={mountRef} className="hero-object" aria-hidden="true" />
}
