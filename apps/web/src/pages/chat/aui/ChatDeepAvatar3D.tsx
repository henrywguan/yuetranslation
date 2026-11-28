/**
 * `#/chat` 3D companion — one three.js canvas + shared office env.
 * Boy / Girl / Both all live in the **same** room (talk, eat, walk…). Both
 * never spawns a second office. Small undocked handle or big docked frame =
 * one diorama. Celebrate / pair fullscreen stay on the 2D GIF path.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  CHAT_DEEP_AVATAR_3D_DRAG_THRESHOLD_PX,
  CHAT_DEEP_AVATAR_3D_EVENT,
  CHAT_DEEP_AVATAR_3D_POSE_EVENT,
  chatDeepAvatar3dSolosToMount,
  chatDeepAvatar3dStubTint,
  chatDeepAvatarGlbSrc,
  isChatDeepAvatar3dPointerBlocked,
  readChatDeepAvatar3dEnabled,
  readChatDeepAvatar3dPose,
  resolveChatDeepAvatar3dClipName,
  shouldSnapChatDeepAvatar3dHome,
  writeChatDeepAvatar3dEnabled,
  writeChatDeepAvatar3dPose,
  type ChatDeepAvatar3dPose,
} from '../../../lib/chatDeepAvatar3d'
import {
  chatDeepAvatar3dMoodOverridesAmbient,
  chatDeepAvatar3dRoomCompanionsNear,
  pickChatDeepAvatar3dBehavior,
  pickChatDeepAvatar3dDwellMs,
  pickChatDeepAvatar3dWanderTarget,
  publishChatDeepAvatar3dLivePose,
  publishChatDeepAvatar3dLiveRoomPose,
  readChatDeepAvatar3dPartnerRoomPose,
  resolveChatDeepAvatar3dBehaviorClipName,
  stepChatDeepAvatar3dWalk,
  type ChatDeepAvatar3dBehavior,
} from '../../../lib/chatDeepAvatar3dBehavior'
import {
  CHAT_DEEP_AVATAR_3D_BEHAVIOR_SNAP,
  CHAT_DEEP_AVATAR_3D_ENV_CHAR_HEIGHT,
  CHAT_DEEP_AVATAR_3D_ENV_PROPS,
  CHAT_DEEP_AVATAR_3D_ENV_SNAPS,
  chatDeepAvatar3dEnvSrc,
  clampChatDeepAvatar3dEnvPos,
  pickChatDeepAvatar3dEnvWalkSnap,
  type ChatDeepAvatar3dEnvSnapId,
} from '../../../lib/chatDeepAvatar3dEnv'
import {
  normalizeChatDeepAvatarCharacter,
  type ChatDeepAvatarCharacterId,
  type ChatDeepAvatarMood,
  type ChatDeepAvatarSoloId,
} from '../../../lib/chatDeepAvatarCharacter'
import { useChatDeepAvatarDisplayName } from './ChatDeepAvatar'

const HANDLE_SIZE_PX = 112
/** Stage / bar dock diorama fills the avatar frame (office + character(s)). */
const FRAME_MIN_PX = 160
const DPR_CAP = 1.5

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduce(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])
  return reduce
}

/** Persisted Companion → 3D companion on/off. */
export function useChatDeepAvatar3dEnabled(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => readChatDeepAvatar3dEnabled())
  useEffect(() => {
    const onChange = () => setOn(readChatDeepAvatar3dEnabled())
    window.addEventListener(CHAT_DEEP_AVATAR_3D_EVENT, onChange)
    return () => window.removeEventListener(CHAT_DEEP_AVATAR_3D_EVENT, onChange)
  }, [])
  return [
    on,
    (v) => {
      setOn(writeChatDeepAvatar3dEnabled(v))
    },
  ]
}

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh) {
      mesh.geometry?.dispose()
      const mat = mesh.material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat?.dispose()
    }
  })
}

/** Tiny chibi stand-in until / when `deep.glb` fails to load. */
function buildStubFigure(solo: ChatDeepAvatarSoloId): THREE.Group {
  const tint = chatDeepAvatar3dStubTint(solo)
  const group = new THREE.Group()
  group.name = `chat-avatar-3d-stub-${solo}`

  const bodyMat = new THREE.MeshLambertMaterial({ color: tint })
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffe0c8 })
  const accentMat = new THREE.MeshLambertMaterial({
    color: solo === 'girl' ? 0xf2d4e8 : 0x2a9d6e,
  })

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 6, 12), bodyMat)
  body.position.y = 0.55
  group.add(body)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), skinMat)
  head.position.y = 1.22
  group.add(head)

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), accentMat)
  hair.position.y = 1.38
  hair.scale.set(1, 0.55, 1)
  group.add(hair)

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.01
  group.add(shadow)

  group.scale.setScalar(0.9)
  return group
}

type CharAgent = {
  solo: ChatDeepAvatarSoloId
  root: THREE.Group
  figure: THREE.Object3D
  mixer: THREE.AnimationMixer | null
  clips: THREE.AnimationClip[]
  action: THREE.AnimationAction | null
  clipName: string | null
  roomPos: { x: number; z: number; yaw: number }
}

type SceneBundle = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /** Room / office group (null when env GLB missing). */
  env: THREE.Object3D | null
  /** Meshy hero props layered into the room (may be empty). */
  props: THREE.Group | null
  /** One agent per solo — Both shares this scene/env. */
  agents: Map<ChatDeepAvatarSoloId, CharAgent>
  setMood: (solo: ChatDeepAvatarSoloId, mood: ChatDeepAvatarMood) => void
  setBehavior: (solo: ChatDeepAvatarSoloId, behavior: ChatDeepAvatar3dBehavior) => void
  setRoomSnap: (solo: ChatDeepAvatarSoloId, snap: ChatDeepAvatar3dEnvSnapId) => void
  stepRoomWalk: (
    solo: ChatDeepAvatarSoloId,
    target: { x: number; z: number },
    dt: number,
  ) => { arrived: boolean }
  resize: (w: number, h: number) => void
  dispose: () => void
}

function playNamedClip(agent: CharAgent, want: string | null) {
  if (!agent.mixer || !agent.clips.length || !want) {
    agent.clipName = null
    return
  }
  if (agent.clipName === want && agent.action) return
  const clip = agent.clips.find((c) => c.name === want)
  if (!clip) {
    agent.clipName = null
    return
  }
  const next = agent.mixer.clipAction(clip)
  next.reset()
  next.enabled = true
  next.setLoop(THREE.LoopRepeat, Infinity)
  next.clampWhenFinished = false
  if (agent.action && agent.action !== next) {
    agent.action.crossFadeTo(next, 0.18, false)
  }
  next.play()
  agent.action = next
  agent.clipName = want
}

function playMoodClip(agent: CharAgent, mood: ChatDeepAvatarMood) {
  if (!agent.mixer || !agent.clips.length) {
    agent.clipName = null
    return
  }
  const names = agent.clips.map((c) => c.name)
  playNamedClip(agent, resolveChatDeepAvatar3dClipName(mood, names))
}

function playBehaviorClip(agent: CharAgent, behavior: ChatDeepAvatar3dBehavior) {
  if (!agent.mixer || !agent.clips.length) {
    agent.clipName = null
    return
  }
  const names = agent.clips.map((c) => c.name)
  playNamedClip(agent, resolveChatDeepAvatar3dBehaviorClipName(behavior, names))
}

function loadGltf(url: string): Promise<Awaited<ReturnType<GLTFLoader['loadAsync']>> | null> {
  const loader = new GLTFLoader()
  return new Promise((resolve) => {
    loader.load(
      url,
      (g) => resolve(g),
      undefined,
      () => resolve(null),
    )
  })
}

/** Default floor snap so Both don't stack on the same chair. */
function defaultSpawnSnap(
  solo: ChatDeepAvatarSoloId,
  solos: readonly ChatDeepAvatarSoloId[],
): ChatDeepAvatar3dEnvSnapId {
  if (solos.length > 1) return solo === 'girl' ? 'sofa' : 'chair'
  return 'chair'
}

async function mountCharacter(
  scene: THREE.Scene,
  solo: ChatDeepAvatarSoloId,
  hasEnv: boolean,
  solos: readonly ChatDeepAvatarSoloId[],
  initialMood: ChatDeepAvatarMood,
): Promise<CharAgent> {
  const root = new THREE.Group()
  root.name = `chat-avatar-3d-char-${solo}`
  scene.add(root)

  let figure: THREE.Object3D = buildStubFigure(solo)
  root.add(figure)

  let mixer: THREE.AnimationMixer | null = null
  let clips: THREE.AnimationClip[] = []

  try {
    const gltf = await loadGltf(chatDeepAvatarGlbSrc(solo))
    if (gltf) {
      const wrap = new THREE.Group()
      wrap.name = `chat-avatar-3d-glb-${solo}`
      wrap.add(gltf.scene)
      wrap.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(wrap)
      const size = new THREE.Vector3()
      box.getSize(size)
      const h = size.y || 1
      const targetH = hasEnv ? CHAT_DEEP_AVATAR_3D_ENV_CHAR_HEIGHT : 1.55
      const scale = targetH / h
      wrap.scale.setScalar(scale)
      wrap.position.y = -box.min.y * scale
      disposeObject3D(figure)
      root.remove(figure)
      figure = wrap
      root.add(figure)
      clips = gltf.animations?.slice() ?? []
      if (clips.length) mixer = new THREE.AnimationMixer(figure)
    }
  } catch {
    /* keep procedural stub */
  }

  const snapId = defaultSpawnSnap(solo, solos)
  const snap = CHAT_DEEP_AVATAR_3D_ENV_SNAPS[snapId]
  const roomPos = { x: snap.x, z: snap.z, yaw: snap.yaw }

  if (hasEnv) {
    root.position.set(snap.x, 0, snap.z)
    root.rotation.y = snap.yaw
  } else if (solos.length > 1) {
    // Env-less Both: stand side-by-side in the chibi camera framing.
    root.position.x = solo === 'girl' ? 0.45 : -0.45
  }

  const agent: CharAgent = {
    solo,
    root,
    figure,
    mixer,
    clips,
    action: null,
    clipName: null,
    roomPos,
  }
  playMoodClip(agent, initialMood)
  return agent
}

async function mountScene(
  canvas: HTMLCanvasElement,
  solos: readonly ChatDeepAvatarSoloId[],
  initialMood: ChatDeepAvatarMood,
): Promise<SceneBundle | null> {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    })
  } catch {
    return null
  }
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(DPR_CAP, window.devicePixelRatio || 1))
  renderer.setSize(HANDLE_SIZE_PX, HANDLE_SIZE_PX, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 40)

  const hemi = new THREE.HemisphereLight(0xfff6ea, 0x445566, 0.85)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xfff2d8, 0.9)
  key.position.set(-2.4, 4.2, 1.2)
  scene.add(key)
  const fill = new THREE.PointLight(0xdde8ff, 18, 12, 2)
  fill.position.set(1.4, 2.1, 1.8)
  scene.add(fill)

  let env: THREE.Object3D | null = null
  let propsGroup: THREE.Group | null = null
  try {
    const envGltf = await loadGltf(chatDeepAvatar3dEnvSrc())
    if (envGltf) {
      const wrap = new THREE.Group()
      wrap.name = 'chat-avatar-3d-env'
      wrap.add(envGltf.scene)
      // Drop authored cameras/lights/empties from the exported GLB — we own framing.
      const strip: THREE.Object3D[] = []
      wrap.traverse((o) => {
        const n = o.name || ''
        if (
          o.type === 'PerspectiveCamera' ||
          o.type === 'OrthographicCamera' ||
          o.type === 'DirectionalLight' ||
          o.type === 'PointLight' ||
          o.type === 'SpotLight' ||
          o.type === 'HemisphereLight' ||
          n.startsWith('CAM_') ||
          n.startsWith('LGT_') ||
          n.startsWith('SNAP_') ||
          n.startsWith('PATH_')
        ) {
          strip.push(o)
        }
      })
      for (const o of strip) o.parent?.remove(o)
      scene.add(wrap)
      env = wrap

      // Layer compressed Meshy hero props; hide procedural stand-ins they replace.
      propsGroup = new THREE.Group()
      propsGroup.name = 'chat-avatar-3d-props'
      scene.add(propsGroup)
      const hidePrefixes = new Set<string>()
      await Promise.all(
        CHAT_DEEP_AVATAR_3D_ENV_PROPS.map(async (prop) => {
          const g = await loadGltf(prop.src)
          if (!g || !propsGroup) return
          const node = new THREE.Group()
          node.name = `prop-${prop.id}`
          node.add(g.scene)
          node.updateMatrixWorld(true)
          const box = new THREE.Box3().setFromObject(node)
          const size = new THREE.Vector3()
          box.getSize(size)
          const h = Math.max(0.01, size.y || 1)
          const scale = prop.height / h
          node.scale.setScalar(scale)
          node.updateMatrixWorld(true)
          const box2 = new THREE.Box3().setFromObject(node)
          node.position.set(prop.x, -box2.min.y, prop.z)
          node.rotation.y = prop.yaw
          propsGroup.add(node)
          for (const p of prop.hidePrefixes) hidePrefixes.add(p)
        }),
      )
      if (hidePrefixes.size) {
        wrap.traverse((o) => {
          const n = o.name || ''
          for (const prefix of hidePrefixes) {
            if (n === prefix || n.startsWith(prefix)) {
              o.visible = false
              break
            }
          }
        })
      }
    }
  } catch {
    /* character-only fallback */
  }

  const agents = new Map<ChatDeepAvatarSoloId, CharAgent>()
  for (const solo of solos) {
    const agent = await mountCharacter(scene, solo, Boolean(env), solos, initialMood)
    agents.set(solo, agent)
  }

  const applyRoomPos = (agent: CharAgent, x: number, z: number, yaw: number) => {
    const c = clampChatDeepAvatar3dEnvPos(x, z)
    agent.root.position.set(c.x, 0, c.z)
    agent.root.rotation.y = yaw
    agent.roomPos.x = c.x
    agent.roomPos.z = c.z
    agent.roomPos.yaw = yaw
  }

  const frameCamera = (w: number, h: number) => {
    const aspect = Math.max(0.5, w / Math.max(1, h))
    camera.aspect = aspect
    if (env) {
      // Peek into the open-front room — must match Jutsu `CAM_main` (z≈−3.55).
      // +Z puts the lens behind ENV_wall_back and paints a grey slab.
      camera.fov = aspect < 0.85 ? 42 : 36
      camera.position.set(0.15, 1.55, -3.55)
      camera.lookAt(0.05, 0.95, 0.35)
    } else {
      camera.fov = 32
      camera.position.set(0, 0.95, 3.4)
      camera.lookAt(0, 0.75, 0)
    }
    camera.updateProjectionMatrix()
  }

  const bundle: SceneBundle = {
    renderer,
    scene,
    camera,
    env,
    props: propsGroup,
    agents,
    setMood: (solo, mood) => {
      const a = agents.get(solo)
      if (a) playMoodClip(a, mood)
    },
    setBehavior: (solo, behavior) => {
      const a = agents.get(solo)
      if (a) playBehaviorClip(a, behavior)
    },
    setRoomSnap: (solo, snap) => {
      const a = agents.get(solo)
      if (!a) return
      const s = CHAT_DEEP_AVATAR_3D_ENV_SNAPS[snap]
      applyRoomPos(a, s.x, s.z, s.yaw)
    },
    stepRoomWalk: (solo, target, dt) => {
      const a = agents.get(solo)
      if (!a) return { arrived: true }
      const speed = 0.85
      const dx = target.x - a.roomPos.x
      const dz = target.z - a.roomPos.z
      const dist = Math.hypot(dx, dz)
      const step = speed * Math.max(0, dt)
      if (dist < 0.04 || step >= dist) {
        const yaw = Math.atan2(dx, dz)
        applyRoomPos(a, target.x, target.z, yaw)
        return { arrived: true }
      }
      const t = step / dist
      const nx = a.roomPos.x + dx * t
      const nz = a.roomPos.z + dz * t
      const yaw = Math.atan2(dx, dz)
      applyRoomPos(a, nx, nz, yaw)
      a.root.userData.ambientFacing = true
      return { arrived: false }
    },
    resize: (w, h) => {
      const ww = Math.max(FRAME_MIN_PX, Math.floor(w))
      const hh = Math.max(FRAME_MIN_PX, Math.floor(h))
      renderer.setSize(ww, hh, false)
      frameCamera(ww, hh)
    },
    dispose: () => {
      cancelAnimationFrame(raf)
      for (const a of agents.values()) {
        a.mixer?.stopAllAction()
        disposeObject3D(a.root)
      }
      if (env) disposeObject3D(env)
      if (propsGroup) disposeObject3D(propsGroup)
      renderer.dispose()
    },
  }

  frameCamera(HANDLE_SIZE_PX, HANDLE_SIZE_PX)

  let raf = 0
  let last = performance.now()
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    for (const a of agents.values()) {
      if (a.mixer && a.clipName) {
        a.mixer.update(dt)
        if (!env && !a.root.userData.ambientFacing) {
          a.root.rotation.y += dt * 0.18
        }
      } else if (!env) {
        a.root.rotation.y += dt * 0.35
        a.root.position.y = Math.sin(now / 650 + (a.solo === 'girl' ? 1.2 : 0)) * 0.04
      }
    }
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return bundle
}

function behaviorSnapKey(
  settled: ChatDeepAvatar3dBehavior,
): 'study' | 'work' | 'eat' | 'idle' | 'interact' {
  if (settled === 'eat') return 'eat'
  if (settled === 'deskNap' || settled === 'study') return 'study'
  if (settled === 'work') return 'work'
  if (settled === 'interact') return 'interact'
  return 'idle'
}

type OverlayProps = {
  /** Solos that share this one canvas / office (Both → boy+girl). */
  solos: readonly ChatDeepAvatarSoloId[]
  mood: ChatDeepAvatarMood
  /** Bar / stage dock origin — home snap + follow when docked. */
  dockRef: RefObject<HTMLElement | null>
  /** Fallback layout; surface prefers `.ds-chat` so drag covers inbox/workspace. */
  layoutRef: RefObject<HTMLElement | null>
  /** When WebGL mounts successfully. */
  onActiveChange?: (active: boolean) => void
}

/**
 * One floating office frame for the companion pick. Parent mounts only when
 * Companion → 3D is on and reduced-motion is off. Pointer events live on the handle.
 */
export function ChatDeepAvatar3DOverlay({
  solos,
  mood,
  dockRef,
  layoutRef,
  onActiveChange,
}: OverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handleRef = useRef<HTMLDivElement | null>(null)
  const bundleRef = useRef<SceneBundle | null>(null)
  const primary = solos[0] ?? 'boy'
  const duo = solos.length > 1
  const charId: ChatDeepAvatarCharacterId = duo ? 'both' : primary
  const name = useChatDeepAvatarDisplayName(charId)
  const solosKey = solos.join(',')
  const [pose, setPose] = useState<ChatDeepAvatar3dPose>(() => readChatDeepAvatar3dPose(primary))
  const [webglOk, setWebglOk] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [surfaceEl, setSurfaceEl] = useState<HTMLElement | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)

  const resolveSurface = (): HTMLElement | null => {
    const layout = layoutRef.current
    if (!layout) return null
    return (layout.closest('.ds-chat') as HTMLElement | null) || layout
  }

  /** Frame pose follows primary; Both keeps docked flag synced across solos. */
  const writeFramePose = (next: Partial<ChatDeepAvatar3dPose>) => {
    const saved = writeChatDeepAvatar3dPose(primary, next)
    if (duo && next.docked != null) {
      for (const solo of solos) {
        if (solo !== primary) writeChatDeepAvatar3dPose(solo, { docked: next.docked })
      }
    }
    return saved
  }

  useEffect(() => {
    const sync = () => setPose(readChatDeepAvatar3dPose(primary))
    window.addEventListener(CHAT_DEEP_AVATAR_3D_POSE_EVENT, sync)
    return () => window.removeEventListener(CHAT_DEEP_AVATAR_3D_POSE_EVENT, sync)
  }, [primary])

  useEffect(() => {
    setPose(readChatDeepAvatar3dPose(primary))
  }, [primary, solosKey])

  useLayoutEffect(() => {
    const sync = () => setSurfaceEl(resolveSurface())
    sync()
    const raf = requestAnimationFrame(sync)
    return () => cancelAnimationFrame(raf)
  }, [layoutRef])

  useEffect(() => {
    // Portal canvas only exists after surfaceEl is known — remount when surface appears.
    if (!surfaceEl) return
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    let bundle: SceneBundle | null = null
    void mountScene(canvas, solos, mood).then((b) => {
      if (cancelled) {
        b?.dispose()
        return
      }
      if (!b) {
        setWebglOk(false)
        onActiveChange?.(false)
        return
      }
      bundle = b
      bundleRef.current = b
      setWebglOk(true)
      onActiveChange?.(true)
    })
    return () => {
      cancelled = true
      bundle?.dispose()
      bundleRef.current = null
      onActiveChange?.(false)
    }
    // remount on solos / portal surface — mood updates via setMood below
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mood applied in separate effect
  }, [solosKey, onActiveChange, surfaceEl])

  const moodOverride = chatDeepAvatar3dMoodOverridesAmbient(mood)
  useEffect(() => {
    const b = bundleRef.current
    if (!b) return
    if (moodOverride) {
      for (const a of b.agents.values()) {
        a.root.userData.ambientFacing = false
        b.setMood(a.solo, mood)
      }
    }
  }, [mood, moodOverride])

  // Ambient idle AI: shared office snaps when env loads; else page wander of the frame.
  useEffect(() => {
    if (moodOverride || dragging) return
    let cancelled = false
    let raf = 0
    let last = performance.now()

    type AgentAI = {
      behavior: ChatDeepAvatar3dBehavior
      roomTarget: { x: number; z: number } | null
      dwellUntil: number
      nextPickAt: number
    }
    const ai = new Map<ChatDeepAvatarSoloId, AgentAI>()
    for (const solo of solos) {
      ai.set(solo, {
        behavior: 'idle',
        roomTarget: null,
        dwellUntil: 0,
        nextPickAt: performance.now() + 600 + Math.random() * 900 + (solo === 'girl' ? 400 : 0),
      })
    }
    let screenTarget: { x: number; y: number } | null = null
    let screenPersistAt = 0
    let screenBehavior: ChatDeepAvatar3dBehavior = 'idle'
    let screenDwellUntil = 0
    let screenNextPickAt = performance.now() + 800

    const ensureUndocked = (cur: ChatDeepAvatar3dPose): ChatDeepAvatar3dPose => {
      if (!cur.docked) return cur
      const surface = resolveSurface()
      const handle = handleRef.current
      if (!surface || !handle) return { ...cur, docked: false }
      const lr = surface.getBoundingClientRect()
      const hr = handle.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (hr.left + hr.width / 2 - lr.left) / lr.width))
      const y = Math.min(1, Math.max(0, (hr.top + hr.height / 2 - lr.top) / lr.height))
      const next = writeFramePose({ x, y, docked: false })
      setPose(next)
      return next
    }

    const applyBehaviorClip = (solo: ChatDeepAvatarSoloId, next: ChatDeepAvatar3dBehavior) => {
      const state = ai.get(solo)
      if (state) state.behavior = next
      bundleRef.current?.setBehavior(solo, next)
      const root = bundleRef.current?.agents.get(solo)?.root
      if (root) root.userData.ambientFacing = next === 'walk'
    }

    const settleAfterArrive = (
      solo: ChatDeepAvatarSoloId,
      now: number,
      preferInteract: boolean,
    ) => {
      const state = ai.get(solo)
      if (!state) return
      const dwell = pickChatDeepAvatar3dBehavior(Math.random, {
        preferInteract: preferInteract || undefined,
      })
      const settled: ChatDeepAvatar3dBehavior =
        dwell === 'walk' ? (preferInteract ? 'interact' : 'idle') : dwell
      const b = bundleRef.current
      if (b?.env) {
        b.setRoomSnap(solo, CHAT_DEEP_AVATAR_3D_BEHAVIOR_SNAP[behaviorSnapKey(settled)])
      }
      state.dwellUntil = now + pickChatDeepAvatar3dDwellMs(settled)
      applyBehaviorClip(solo, settled)
      state.nextPickAt = state.dwellUntil
    }

    const pickNextOffice = (solo: ChatDeepAvatarSoloId, now: number) => {
      const state = ai.get(solo)
      const b = bundleRef.current
      const agent = b?.agents.get(solo)
      if (!state || !b || !agent) return

      const partner = duo ? readChatDeepAvatar3dPartnerRoomPose(solo) : null
      const preferInteract = Boolean(
        partner && chatDeepAvatar3dRoomCompanionsNear(agent.roomPos, partner),
      )
      const next = pickChatDeepAvatar3dBehavior(Math.random, { preferInteract })

      if (next === 'walk' || (preferInteract && next === 'interact' && partner)) {
        if (preferInteract && partner) {
          // Walk toward partner for a chat, slightly offset so they don't overlap.
          const ox = solo === 'boy' ? -0.18 : 0.18
          state.roomTarget = clampChatDeepAvatar3dEnvPos(partner.x + ox, partner.z)
        } else {
          const snapId = pickChatDeepAvatar3dEnvWalkSnap()
          const snap = CHAT_DEEP_AVATAR_3D_ENV_SNAPS[snapId]
          state.roomTarget = { x: snap.x, z: snap.z }
        }
        state.dwellUntil = 0
        applyBehaviorClip(solo, 'walk')
      } else {
        state.roomTarget = null
        b.setRoomSnap(solo, CHAT_DEEP_AVATAR_3D_BEHAVIOR_SNAP[behaviorSnapKey(next)])
        state.dwellUntil = now + pickChatDeepAvatar3dDwellMs(next)
        applyBehaviorClip(solo, next)
      }
      state.nextPickAt = now + 40_000
    }

    const pickNextScreen = (now: number, pos: { x: number; y: number }) => {
      const next = pickChatDeepAvatar3dBehavior(Math.random)
      if (next === 'walk') {
        screenTarget = pickChatDeepAvatar3dWanderTarget()
        screenDwellUntil = 0
        screenBehavior = 'walk'
        for (const solo of solos) applyBehaviorClip(solo, 'walk')
      } else {
        screenTarget = null
        screenDwellUntil = now + pickChatDeepAvatar3dDwellMs(next)
        screenBehavior = next
        for (const solo of solos) applyBehaviorClip(solo, next)
      }
      screenNextPickAt = now + 40_000
      void pos
    }

    const tick = (now: number) => {
      if (cancelled) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const b = bundleRef.current
      const handle = handleRef.current
      const surface = resolveSurface()
      if (!b || !handle || !surface) {
        raf = requestAnimationFrame(tick)
        return
      }

      const inOffice = Boolean(b.env)
      let pos = readChatDeepAvatar3dPose(primary)
      publishChatDeepAvatar3dLivePose(primary, { x: pos.x, y: pos.y })

      if (inOffice) {
        for (const solo of solos) {
          const agent = b.agents.get(solo)
          const state = ai.get(solo)
          if (!agent || !state) continue
          publishChatDeepAvatar3dLiveRoomPose(solo, {
            x: agent.roomPos.x,
            z: agent.roomPos.z,
          })

          if (
            now >= state.nextPickAt ||
            (state.behavior !== 'walk' && state.dwellUntil > 0 && now >= state.dwellUntil)
          ) {
            pickNextOffice(solo, now)
          }

          if (state.behavior === 'walk' && state.roomTarget) {
            const arrived = b.stepRoomWalk(solo, state.roomTarget, dt).arrived
            if (arrived) {
              state.roomTarget = null
              const partner = duo ? readChatDeepAvatar3dPartnerRoomPose(solo) : null
              const preferInteract = Boolean(
                partner && chatDeepAvatar3dRoomCompanionsNear(agent.roomPos, partner),
              )
              settleAfterArrive(solo, now, preferInteract)
            }
          }
        }
      } else {
        // Env-less fallback: wander the shared frame on the page.
        if (
          now >= screenNextPickAt ||
          (screenBehavior !== 'walk' && screenDwellUntil > 0 && now >= screenDwellUntil)
        ) {
          pos = ensureUndocked(pos)
          pickNextScreen(now, pos)
        }
        if (screenBehavior === 'walk' && screenTarget) {
          pos = ensureUndocked(pos)
          const stepped = stepChatDeepAvatar3dWalk({ x: pos.x, y: pos.y }, screenTarget, dt)
          const lr = surface.getBoundingClientRect()
          handle.style.left = `${stepped.x * lr.width}px`
          handle.style.top = `${stepped.y * lr.height}px`
          publishChatDeepAvatar3dLivePose(primary, { x: stepped.x, y: stepped.y })
          if (stepped.arrived) {
            const saved = writeFramePose({
              x: stepped.x,
              y: stepped.y,
              docked: false,
            })
            setPose(saved)
            screenTarget = null
            screenBehavior = 'idle'
            screenDwellUntil = now + pickChatDeepAvatar3dDwellMs('idle')
            screenNextPickAt = screenDwellUntil
            for (const solo of solos) applyBehaviorClip(solo, 'idle')
          } else if (now >= screenPersistAt) {
            screenPersistAt = now + 1200
            writeFramePose({ x: stepped.x, y: stepped.y, docked: false })
          }
        }
      }

      raf = requestAnimationFrame(tick)
    }

    for (const solo of solos) {
      applyBehaviorClip(solo, 'idle')
      const b0 = bundleRef.current
      if (b0?.env) b0.setRoomSnap(solo, defaultSpawnSnap(solo, solos))
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      for (const solo of solos) {
        publishChatDeepAvatar3dLivePose(solo, null)
        publishChatDeepAvatar3dLiveRoomPose(solo, null)
        const root = bundleRef.current?.agents.get(solo)?.root
        if (root) root.userData.ambientFacing = false
      }
    }
  }, [solosKey, moodOverride, dragging, duo, primary])

  // Follow dock origin while docked; fill the avatar frame when the office env is loaded.
  // Both: ONE full-width office (never half-width dual frames).
  useLayoutEffect(() => {
    const surface = resolveSurface() || surfaceEl
    const handle = handleRef.current
    if (!surface || !handle) return
    setSurfaceEl(surface)

    const place = () => {
      const lr = surface.getBoundingClientRect()
      if (lr.width < 8 || lr.height < 8) return
      const b = bundleRef.current
      const dock = dockRef.current

      if (pose.docked && dock && b?.env) {
        const dr = dock.getBoundingClientRect()
        const w = Math.max(FRAME_MIN_PX, Math.floor(dr.width))
        const h = Math.max(FRAME_MIN_PX, Math.floor(dr.height))
        handle.style.width = `${w}px`
        handle.style.height = `${h}px`
        handle.style.left = `${dr.left + dr.width / 2 - lr.left}px`
        handle.style.top = `${dr.top + dr.height / 2 - lr.top}px`
        handle.classList.add('is-office-frame')
        b.resize(w, h)
        return
      }

      handle.classList.remove('is-office-frame')
      handle.style.width = `${HANDLE_SIZE_PX}px`
      handle.style.height = `${HANDLE_SIZE_PX}px`
      // Always resize on undock — env may still be loaded from the office frame.
      if (b) b.resize(HANDLE_SIZE_PX, HANDLE_SIZE_PX)

      if (pose.docked && dock) {
        const dr = dock.getBoundingClientRect()
        const cx = dr.left + dr.width / 2 - lr.left
        const cy = dr.top + dr.height * 0.42 - lr.top
        handle.style.left = `${cx}px`
        handle.style.top = `${cy}px`
        return
      }
      handle.style.left = `${pose.x * lr.width}px`
      handle.style.top = `${pose.y * lr.height}px`
    }

    place()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null
    ro?.observe(surface)
    if (dockRef.current) ro?.observe(dockRef.current)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    const t = window.setTimeout(place, 80)
    return () => {
      window.clearTimeout(t)
      ro?.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [pose, dockRef, layoutRef, dragging, surfaceEl, webglOk])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if (isChatDeepAvatar3dPointerBlocked(e.target)) return
    e.preventDefault()
    e.stopPropagation()
    const surface = resolveSurface()
    const handle = handleRef.current
    if (!surface || !handle) return
    const lr = surface.getBoundingClientRect()
    const hr = handle.getBoundingClientRect()
    const cx = (hr.left + hr.width / 2 - lr.left) / lr.width
    const cy = (hr.top + hr.height / 2 - lr.top) / lr.height
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: cx,
      originY: cy,
      moved: false,
    }
    handle.setPointerCapture(e.pointerId)
    setDragging(true)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const surface = resolveSurface()
    const handle = handleRef.current
    if (!drag || drag.pointerId !== e.pointerId || !surface || !handle) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (!drag.moved) {
      if (dx * dx + dy * dy < CHAT_DEEP_AVATAR_3D_DRAG_THRESHOLD_PX ** 2) return
      drag.moved = true
    }
    e.preventDefault()
    e.stopPropagation()
    const lr = surface.getBoundingClientRect()
    const nx = Math.min(1, Math.max(0, drag.originX + dx / lr.width))
    const ny = Math.min(1, Math.max(0, drag.originY + dy / lr.height))
    handle.style.left = `${nx * lr.width}px`
    handle.style.top = `${ny * lr.height}px`
  }

  const finishDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const surface = resolveSurface()
    const handle = handleRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    setDragging(false)
    try {
      handle?.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    if (!surface || !handle || !drag.moved) return

    const lr = surface.getBoundingClientRect()
    const hr = handle.getBoundingClientRect()
    const cx = hr.left + hr.width / 2 - lr.left
    const cy = hr.top + hr.height / 2 - lr.top
    const dock = dockRef.current
    let next: ChatDeepAvatar3dPose = {
      x: Math.min(1, Math.max(0, cx / lr.width)),
      y: Math.min(1, Math.max(0, cy / lr.height)),
      docked: false,
    }
    if (dock) {
      const dr = dock.getBoundingClientRect()
      const dcx = dr.left + dr.width / 2 - lr.left
      const dcy = dr.top + dr.height * 0.42 - lr.top
      if (shouldSnapChatDeepAvatar3dHome(cx, cy, dcx, dcy)) {
        next = { x: dcx / lr.width, y: dcy / lr.height, docked: true }
      }
    }
    const saved = writeFramePose(next)
    setPose(saved)
  }

  if (!webglOk || !surfaceEl) return null

  const style: CSSProperties = {
    width: HANDLE_SIZE_PX,
    height: HANDLE_SIZE_PX,
  }

  return createPortal(
    <div
      ref={handleRef}
      className={`aui-deep-avatar-3d-handle${dragging ? ' is-dragging' : ''}${pose.docked ? ' is-docked' : ' is-free'}`}
      data-character={charId}
      data-mood={mood}
      data-docked={pose.docked ? '1' : '0'}
      data-duo={duo ? '1' : '0'}
      data-shared-office="1"
      style={style}
      role="img"
      aria-label={`${name} 3D companion — shared office in the avatar frame; drag to undock`}
      title="Shared office in the avatar frame · drag to undock · drop near dock to snap home"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <canvas
        ref={canvasRef}
        className="aui-deep-avatar-3d-canvas"
        width={HANDLE_SIZE_PX}
        height={HANDLE_SIZE_PX}
      />
    </div>,
    surfaceEl,
  )
}

type GateProps = {
  enabled: boolean
  character: ChatDeepAvatarCharacterId
  mood: ChatDeepAvatarMood
  dockRef: RefObject<HTMLElement | null>
  layoutRef: RefObject<HTMLElement | null>
  onActiveChange?: (active: boolean) => void
}

/**
 * Reduced-motion + toggle gate. Always one overlay: solo companion or Both
 * (boy+girl) sharing a single office scene — never dual rooms.
 */
export function ChatDeepAvatar3DGate(props: GateProps) {
  const reduce = usePrefersReducedMotion()
  const active = props.enabled && !reduce
  const char = normalizeChatDeepAvatarCharacter(props.character)
  const solos = chatDeepAvatar3dSolosToMount(char)

  if (!active) return null

  return (
    <ChatDeepAvatar3DOverlay
      solos={solos}
      mood={props.mood}
      dockRef={props.dockRef}
      layoutRef={props.layoutRef}
      onActiveChange={props.onActiveChange}
    />
  )
}
