import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useTheme } from '../lib/theme'
import { getMicLevel } from '../lib/audioReactive'

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vLocal;

uniform float uTime;
uniform float uMic;

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
  float t = uTime * 0.09;

  float drift = fbm(uv * 2.8 + vec2(t * 0.28, t * 0.18)) - 0.48;
  float mic = uMic;

  // Sound ripple: radial pulse from center, amplitude from mic level
  float dist = length(uv - 0.5) * 2.0;
  float pulse = sin(dist * 8.0 - uTime * 3.5) * mic * 0.45;
  // Low frequency sway from mic
  float sway = sin(uv.x * 4.2 + uTime * 1.8) * sin(uv.y * 3.6 + uTime * 1.2) * mic * 0.35;

  p.z += drift * 0.42 + pulse + sway;

  vLocal = p;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const FRAG = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vLocal;

uniform vec3 uHarbor;
uniform vec3 uCool;
uniform vec3 uJade;
uniform vec3 uMint;
uniform float uOpacity;
uniform float uMic;

void main() {
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float wrap = 0.55 + 0.45 * dot(n, normalize(vec3(-0.3, 0.7, 0.55)));
  float ridge = smoothstep(0.02, 0.48, vLocal.z + 0.10);

  vec3 col = mix(uHarbor, uCool, clamp(vUv.x * 0.38 + vUv.y * 0.20, 0.0, 1.0));
  col = mix(col, uJade, ridge * 0.55);
  col = mix(col, uMint, ridge * ridge * 0.20);

  // Sound: jade brightens with mic energy
  col = mix(col, uMint, uMic * ridge * 0.35);

  col *= mix(0.86, 1.06, wrap);

  float edge = smoothstep(0.0, 0.18, vUv.x)
    * smoothstep(0.0, 0.18, vUv.y)
    * smoothstep(1.0, 0.82, vUv.x)
    * smoothstep(1.0, 0.82, vUv.y);
  float alpha = uOpacity * mix(0.68, 1.0, ridge) * mix(0.35, 1.0, edge);
  gl_FragColor = vec4(col, alpha);
}
`

function fitOrtho(cam: THREE.OrthographicCamera, w: number, h: number) {
  const aspect = w / Math.max(h, 1)
  const halfH = 3.8
  cam.left = -halfH * aspect
  cam.right = halfH * aspect
  cam.top = halfH
  cam.bottom = -halfH
  cam.updateProjectionMatrix()
}

/**
 * App background: a quiet harbor cloth mesh behind the translator.
 * When the mic is live, displacement reacts to audio energy.
 * Pauses when the tab is hidden; ~30fps cap.
 */
export function AppClothBg({ listening }: { listening: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { theme } = useTheme()
  const listeningRef = useRef(listening)
  listeningRef.current = listening

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
    camera.position.set(0, 0.4, 8)
    camera.lookAt(0, 0, 0)
    fitOrtho(camera, width, height)

    const uniforms = {
      uTime: { value: reduced ? 5 : 0 },
      uMic: { value: 0 },
      uHarbor: { value: new THREE.Color(light ? '#d7e6ee' : '#07131f') },
      uCool: { value: new THREE.Color(light ? '#b7d4e8' : '#12324a') },
      uJade: { value: new THREE.Color(light ? '#1f9f8a' : '#3dcfb6') },
      uMint: { value: new THREE.Color(light ? '#5ecfb8' : '#9af0de') },
      uOpacity: { value: light ? 0.30 : 0.36 },
    }

    const geo = new THREE.PlaneGeometry(24, 16, 64, 42)
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    })
    const cloth = new THREE.Mesh(geo, mat)
    cloth.rotation.x = -0.48
    cloth.position.set(0, -0.3, 0)
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
    let lastDraw = 0
    const t0 = performance.now()
    const frameMs = 33
    let smoothMic = 0

    const renderFrame = (now = performance.now()) => {
      const t = (now - t0) / 1000
      if (!reduced) {
        const rawMic = listeningRef.current ? getMicLevel() : 0
        smoothMic += (rawMic - smoothMic) * 0.12
        uniforms.uTime.value = t
        uniforms.uMic.value = smoothMic
        cloth.rotation.z = Math.sin(t * 0.06) * 0.025
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
      if (reduced || document.hidden || running) return
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

    if (reduced) renderFrame()
    else startLoop()

    return () => {
      stopLoop()
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

  return <div ref={mountRef} className="app-cloth-bg" aria-hidden="true" />
}
