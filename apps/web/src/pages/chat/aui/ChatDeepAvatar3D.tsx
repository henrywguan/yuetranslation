/**
 * `#/chat` 3D companion — transparent three.js overlay + mood→clip mixer +
 * ambient idle AI (wander / study / work / interact). Loads `deep.glb` when
 * present (procedural stub otherwise). Drag anywhere over `.ds-chat`; soft-snap
 * home to bar/stage dock. Both mode mounts two independent GLBs that collaborate
 * when near. Celebrate / pair fullscreen stay on the 2D GIF path.
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
  chatDeepAvatar3dDuoDockOffsetX,
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
  chatDeepAvatar3dCompanionsNear,
  chatDeepAvatar3dMoodOverridesAmbient,
  pickChatDeepAvatar3dBehavior,
  pickChatDeepAvatar3dDwellMs,
  pickChatDeepAvatar3dWanderTarget,
  publishChatDeepAvatar3dLivePose,
  readChatDeepAvatar3dPartnerPose,
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
  isChatDeepAvatarBothMode,
  normalizeChatDeepAvatarCharacter,
  type ChatDeepAvatarCharacterId,
  type ChatDeepAvatarMood,
  type ChatDeepAvatarSoloId,
} from '../../../lib/chatDeepAvatarCharacter'
import { useChatDeepAvatarDisplayName } from './ChatDeepAvatar'

const HANDLE_SIZE_PX = 112
/** Stage / bar dock diorama fills the avatar frame (office + character). */
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
  group.name = 'chat-avatar-3d-stub'

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

type SceneBundle = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /** Room / office group (null when env GLB missing). */
  env: THREE.Object3D | null
  /** Meshy hero props layered into the room (may be empty). */
  props: THREE.Group | null
  /** Character transform root — moved in room XZ when env is loaded. */
  root: THREE.Group
  figure: THREE.Object3D
  mixer: THREE.AnimationMixer | null
  clips: THREE.AnimationClip[]
  action: THREE.AnimationAction | null
  clipName: string | null
  /** World metres when living in the office (Blender X → Three X, Y → Z). */
  roomPos: { x: number; z: number; yaw: number }
  setMood: (mood: ChatDeepAvatarMood) => void
  setBehavior: (behavior: ChatDeepAvatar3dBehavior) => void
  playNamedClip: (want: string | null) => void
  setRoomSnap: (snap: ChatDeepAvatar3dEnvSnapId) => void
  stepRoomWalk: (
    target: { x: number; z: number },
    dt: number,
  ) => { arrived: boolean }
  resize: (w: number, h: number) => void
  dispose: () => void
}

function playNamedClip(bundle: SceneBundle, want: string | null) {
  if (!bundle.mixer || !bundle.clips.length || !want) {
    bundle.clipName = null
    return
  }
  if (bundle.clipName === want && bundle.action) return
  const clip = bundle.clips.find((c) => c.name === want)
  if (!clip) {
    bundle.clipName = null
    return
  }
  const next = bundle.mixer.clipAction(clip)
  next.reset()
  next.enabled = true
  next.setLoop(THREE.LoopRepeat, Infinity)
  next.clampWhenFinished = false
  if (bundle.action && bundle.action !== next) {
    bundle.action.crossFadeTo(next, 0.18, false)
  }
  next.play()
  bundle.action = next
  bundle.clipName = want
}

function playMoodClip(bundle: SceneBundle, mood: ChatDeepAvatarMood) {
  if (!bundle.mixer || !bundle.clips.length) {
    bundle.clipName = null
    return
  }
  const names = bundle.clips.map((c) => c.name)
  playNamedClip(bundle, resolveChatDeepAvatar3dClipName(mood, names))
}

function playBehaviorClip(bundle: SceneBundle, behavior: ChatDeepAvatar3dBehavior) {
  if (!bundle.mixer || !bundle.clips.length) {
    bundle.clipName = null
    return
  }
  const names = bundle.clips.map((c) => c.name)
  playNamedClip(bundle, resolveChatDeepAvatar3dBehaviorClipName(behavior, names))
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

async function mountScene(
  canvas: HTMLCanvasElement,
  solo: ChatDeepAvatarSoloId,
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

  const root = new THREE.Group()
  root.name = 'chat-avatar-3d-char'
  scene.add(root)

  let figure: THREE.Object3D = buildStubFigure(solo)
  root.add(figure)

  let mixer: THREE.AnimationMixer | null = null
  let clips: THREE.AnimationClip[] = []

  try {
    const gltf = await loadGltf(chatDeepAvatarGlbSrc(solo))
    if (gltf) {
      const wrap = new THREE.Group()
      wrap.name = 'chat-avatar-3d-glb'
      wrap.add(gltf.scene)
      wrap.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(wrap)
      const size = new THREE.Vector3()
      box.getSize(size)
      const h = size.y || 1
      const targetH = env ? CHAT_DEEP_AVATAR_3D_ENV_CHAR_HEIGHT : 1.55
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

  const chair = CHAT_DEEP_AVATAR_3D_ENV_SNAPS.chair
  const roomPos = { x: chair.x, z: chair.z, yaw: chair.yaw }

  const applyRoomPos = (x: number, z: number, yaw: number) => {
    const c = clampChatDeepAvatar3dEnvPos(x, z)
    root.position.set(c.x, 0, c.z)
    root.rotation.y = yaw
    roomPos.x = c.x
    roomPos.z = c.z
    roomPos.yaw = yaw
  }

  const frameCamera = (w: number, h: number) => {
    const aspect = Math.max(0.5, w / Math.max(1, h))
    camera.aspect = aspect
    if (env) {
      // Peek into the open-front room (matches Jutsu CAM_main intent).
      camera.fov = aspect < 0.85 ? 42 : 36
      camera.position.set(0.12, 1.55, 3.45)
      camera.lookAt(0.05, 0.95, -0.35)
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
    root,
    figure,
    mixer,
    clips,
    action: null,
    clipName: null,
    roomPos,
    setMood: (mood) => playMoodClip(bundle, mood),
    setBehavior: (behavior) => playBehaviorClip(bundle, behavior),
    playNamedClip: (want) => playNamedClip(bundle, want),
    setRoomSnap: (snap) => {
      const s = CHAT_DEEP_AVATAR_3D_ENV_SNAPS[snap]
      applyRoomPos(s.x, s.z, s.yaw)
    },
    stepRoomWalk: (target, dt) => {
      const speed = 0.85
      const dx = target.x - roomPos.x
      const dz = target.z - roomPos.z
      const dist = Math.hypot(dx, dz)
      const step = speed * Math.max(0, dt)
      if (dist < 0.04 || step >= dist) {
        const yaw = Math.atan2(dx, dz)
        applyRoomPos(target.x, target.z, yaw)
        return { arrived: true }
      }
      const t = step / dist
      const nx = roomPos.x + dx * t
      const nz = roomPos.z + dz * t
      const yaw = Math.atan2(dx, dz)
      applyRoomPos(nx, nz, yaw)
      root.userData.ambientFacing = true
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
      mixer?.stopAllAction()
      if (env) disposeObject3D(env)
      if (propsGroup) disposeObject3D(propsGroup)
      disposeObject3D(root)
      renderer.dispose()
    },
  }

  if (env) {
    applyRoomPos(chair.x, chair.z, chair.yaw)
  }
  frameCamera(HANDLE_SIZE_PX, HANDLE_SIZE_PX)
  playMoodClip(bundle, initialMood)

  let raf = 0
  let last = performance.now()
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (mixer && bundle.clipName) {
      mixer.update(dt)
      if (!env && !root.userData.ambientFacing) {
        root.rotation.y += dt * 0.18
      }
    } else if (!env) {
      root.rotation.y += dt * 0.35
      root.position.y = Math.sin(now / 650) * 0.04
    }
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return bundle
}

type OverlayProps = {
  /** Solo mesh identity (always boy|girl — Both mounts two overlays). */
  solo: ChatDeepAvatarSoloId
  mood: ChatDeepAvatarMood
  /** Offset dock home for dual side-by-side. */
  duoOffset: boolean
  /** Bar / stage dock origin — home snap + follow when docked. */
  dockRef: RefObject<HTMLElement | null>
  /** Fallback layout; surface prefers `.ds-chat` so drag covers inbox/workspace. */
  layoutRef: RefObject<HTMLElement | null>
  /** When WebGL mounts successfully. */
  onActiveChange?: (active: boolean) => void
}

/**
 * Floating 3D companion for one solo. Parent mounts only when Companion → 3D
 * is on and reduced-motion is off. Pointer events live only on the handle.
 */
export function ChatDeepAvatar3DOverlay({
  solo,
  mood,
  duoOffset,
  dockRef,
  layoutRef,
  onActiveChange,
}: OverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handleRef = useRef<HTMLDivElement | null>(null)
  const bundleRef = useRef<SceneBundle | null>(null)
  const name = useChatDeepAvatarDisplayName(solo)
  const [pose, setPose] = useState<ChatDeepAvatar3dPose>(() => readChatDeepAvatar3dPose(solo))
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

  useEffect(() => {
    const sync = () => setPose(readChatDeepAvatar3dPose(solo))
    window.addEventListener(CHAT_DEEP_AVATAR_3D_POSE_EVENT, sync)
    return () => window.removeEventListener(CHAT_DEEP_AVATAR_3D_POSE_EVENT, sync)
  }, [solo])

  useEffect(() => {
    setPose(readChatDeepAvatar3dPose(solo))
  }, [solo])

  useLayoutEffect(() => {
    // Prefer `.ds-chat` so free-float covers inbox/workspace; fall back to layout.
    // Re-resolve once after paint in case the layout ref commits a tick later.
    const sync = () => setSurfaceEl(resolveSurface())
    sync()
    const raf = requestAnimationFrame(sync)
    return () => cancelAnimationFrame(raf)
  }, [layoutRef])

  useEffect(() => {
    // Portal canvas only exists after surfaceEl is known — without this dep the
    // first effect run sees canvasRef=null and never mounts WebGL (Boy/Girl/Both
    // stay invisible while the GIF path remains). Remount when surface appears.
    if (!surfaceEl) return
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    let bundle: SceneBundle | null = null
    void mountScene(canvas, solo, mood).then((b) => {
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
    // remount on solo / portal surface — mood updates via setMood below
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mood applied in separate effect
  }, [solo, onActiveChange, surfaceEl])

  // Play-bus / FSM mood briefly overrides ambient AI.
  const moodOverride = chatDeepAvatar3dMoodOverridesAmbient(mood)
  useEffect(() => {
    const b = bundleRef.current
    if (!b) return
    if (moodOverride) {
      b.root.userData.ambientFacing = false
      b.setMood(mood)
    }
  }, [mood, moodOverride])

  // Ambient idle AI: in-office snaps when env loads; else page wander.
  useEffect(() => {
    if (moodOverride || dragging) return
    let cancelled = false
    let raf = 0
    let last = performance.now()
    let behavior: ChatDeepAvatar3dBehavior = 'idle'
    let screenTarget: { x: number; y: number } | null = null
    let roomTarget: { x: number; z: number } | null = null
    let dwellUntil = 0
    let nextPickAt = performance.now() + 600 + Math.random() * 900
    let persistAt = 0

    const ensureUndocked = (cur: ChatDeepAvatar3dPose): ChatDeepAvatar3dPose => {
      if (!cur.docked) return cur
      const surface = resolveSurface()
      const handle = handleRef.current
      if (!surface || !handle) return { ...cur, docked: false }
      const lr = surface.getBoundingClientRect()
      const hr = handle.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (hr.left + hr.width / 2 - lr.left) / lr.width))
      const y = Math.min(1, Math.max(0, (hr.top + hr.height / 2 - lr.top) / lr.height))
      const next = writeChatDeepAvatar3dPose(solo, { x, y, docked: false })
      setPose(next)
      return next
    }

    const applyBehaviorClip = (next: ChatDeepAvatar3dBehavior) => {
      behavior = next
      bundleRef.current?.setBehavior(next)
      const root = bundleRef.current?.root
      if (root) root.userData.ambientFacing = next === 'walk'
    }

    const settleAfterArrive = (now: number, preferInteract: boolean) => {
      const dwell = pickChatDeepAvatar3dBehavior(Math.random, {
        preferInteract: preferInteract || undefined,
      })
      const settled: ChatDeepAvatar3dBehavior =
        dwell === 'walk' ? (preferInteract ? 'interact' : 'idle') : dwell
      const b = bundleRef.current
      if (b?.env) {
        const snapKey =
          settled === 'eat' || settled === 'deskNap' || settled === 'study' || settled === 'work'
            ? settled === 'deskNap'
              ? 'study'
              : settled
            : settled === 'interact'
              ? 'interact'
              : 'idle'
        b.setRoomSnap(CHAT_DEEP_AVATAR_3D_BEHAVIOR_SNAP[snapKey])
      }
      dwellUntil = now + pickChatDeepAvatar3dDwellMs(settled)
      applyBehaviorClip(settled)
      nextPickAt = dwellUntil
    }

    const pickNextOffice = (now: number) => {
      const next = pickChatDeepAvatar3dBehavior(Math.random)
      const b = bundleRef.current
      if (next === 'walk') {
        const snapId = pickChatDeepAvatar3dEnvWalkSnap()
        const snap = CHAT_DEEP_AVATAR_3D_ENV_SNAPS[snapId]
        roomTarget = { x: snap.x, z: snap.z }
        screenTarget = null
        dwellUntil = 0
        applyBehaviorClip('walk')
      } else {
        roomTarget = null
        screenTarget = null
        if (b?.env) {
          const snapKey =
            next === 'eat' || next === 'deskNap' || next === 'study' || next === 'work'
              ? next === 'deskNap'
                ? 'study'
                : next
              : next === 'interact'
                ? 'interact'
                : 'idle'
          b.setRoomSnap(CHAT_DEEP_AVATAR_3D_BEHAVIOR_SNAP[snapKey])
        }
        dwellUntil = now + pickChatDeepAvatar3dDwellMs(next)
        applyBehaviorClip(next)
      }
      nextPickAt = now + 40_000
    }

    const pickNextScreen = (now: number, pos: { x: number; y: number }) => {
      const partner = duoOffset ? readChatDeepAvatar3dPartnerPose(solo) : null
      const preferInteract = Boolean(partner && chatDeepAvatar3dCompanionsNear(pos, partner))
      const next = pickChatDeepAvatar3dBehavior(Math.random, { preferInteract })
      if (next === 'walk') {
        screenTarget = pickChatDeepAvatar3dWanderTarget()
        if (preferInteract && partner) {
          screenTarget = {
            x: (pos.x + partner.x) / 2 + (solo === 'boy' ? -0.04 : 0.04),
            y: (pos.y + partner.y) / 2,
          }
        }
        roomTarget = null
        dwellUntil = 0
        applyBehaviorClip('walk')
      } else {
        screenTarget = null
        roomTarget = null
        dwellUntil = now + pickChatDeepAvatar3dDwellMs(next)
        applyBehaviorClip(next)
      }
      nextPickAt = now + 40_000
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

      const inOffice = Boolean(b.env) && readChatDeepAvatar3dPose(solo).docked
      let pos = readChatDeepAvatar3dPose(solo)
      publishChatDeepAvatar3dLivePose(solo, { x: pos.x, y: pos.y })

      if (now >= nextPickAt || (behavior !== 'walk' && dwellUntil > 0 && now >= dwellUntil)) {
        if (inOffice) {
          // Stay docked — the avatar frame is the workspace.
          if (!pos.docked) {
            pos = writeChatDeepAvatar3dPose(solo, { ...pos, docked: true })
            setPose(pos)
          }
          pickNextOffice(now)
        } else {
          pos = ensureUndocked(pos)
          pickNextScreen(now, pos)
        }
      }

      if (behavior === 'walk' && inOffice && roomTarget) {
        const arrived = b.stepRoomWalk(roomTarget, dt).arrived
        if (arrived) {
          roomTarget = null
          settleAfterArrive(now, false)
        }
      } else if (behavior === 'walk' && screenTarget) {
        pos = ensureUndocked(pos)
        const stepped = stepChatDeepAvatar3dWalk({ x: pos.x, y: pos.y }, screenTarget, dt)
        const dx = screenTarget.x - pos.x
        if (Math.abs(dx) > 0.002 && b.root) {
          const wantYaw = dx > 0 ? 0.55 : -0.55
          b.root.rotation.y += (wantYaw - b.root.rotation.y) * Math.min(1, dt * 4)
          b.root.userData.ambientFacing = true
        }
        const lr = surface.getBoundingClientRect()
        handle.style.left = `${stepped.x * lr.width}px`
        handle.style.top = `${stepped.y * lr.height}px`
        publishChatDeepAvatar3dLivePose(solo, { x: stepped.x, y: stepped.y })
        if (stepped.arrived) {
          const saved = writeChatDeepAvatar3dPose(solo, {
            x: stepped.x,
            y: stepped.y,
            docked: false,
          })
          setPose(saved)
          screenTarget = null
          const partner = duoOffset ? readChatDeepAvatar3dPartnerPose(solo) : null
          const preferInteract = Boolean(
            partner && chatDeepAvatar3dCompanionsNear(saved, partner),
          )
          settleAfterArrive(now, preferInteract)
        } else if (now >= persistAt) {
          persistAt = now + 1200
          writeChatDeepAvatar3dPose(solo, { x: stepped.x, y: stepped.y, docked: false })
        }
      }

      raf = requestAnimationFrame(tick)
    }

    applyBehaviorClip('idle')
    const b0 = bundleRef.current
    if (b0?.env) b0.setRoomSnap('chair')
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      publishChatDeepAvatar3dLivePose(solo, null)
      const root = bundleRef.current?.root
      if (root) root.userData.ambientFacing = false
    }
  }, [solo, moodOverride, dragging, duoOffset])

  // Follow dock origin while docked; fill the avatar frame when the office env is loaded.
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
        // Both mode: half-width office frames side-by-side (keep duo offset).
        const split = Boolean(duoOffset)
        const w = Math.max(FRAME_MIN_PX, Math.floor(split ? dr.width / 2 : dr.width))
        const h = Math.max(FRAME_MIN_PX, Math.floor(dr.height))
        const ox = split
          ? (solo === 'boy' ? -Math.floor(dr.width / 4) : Math.floor(dr.width / 4))
          : 0
        handle.style.width = `${w}px`
        handle.style.height = `${h}px`
        handle.style.left = `${dr.left + dr.width / 2 - lr.left + ox}px`
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
        const ox = duoOffset ? chatDeepAvatar3dDuoDockOffsetX(solo) : 0
        const cx = dr.left + dr.width / 2 - lr.left + ox
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
    // Env may finish loading a tick after mount — re-place once WebGL reports active.
    const t = window.setTimeout(place, 80)
    return () => {
      window.clearTimeout(t)
      ro?.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [pose, dockRef, layoutRef, dragging, surfaceEl, duoOffset, solo, webglOk])

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
      const ox = duoOffset ? chatDeepAvatar3dDuoDockOffsetX(solo) : 0
      const dcx = dr.left + dr.width / 2 - lr.left + ox
      const dcy = dr.top + dr.height * 0.42 - lr.top
      if (shouldSnapChatDeepAvatar3dHome(cx, cy, dcx, dcy)) {
        next = { x: dcx / lr.width, y: dcy / lr.height, docked: true }
      }
    }
    const saved = writeChatDeepAvatar3dPose(solo, next)
    setPose(saved)
  }

  if (!webglOk || !surfaceEl) return null

  const style: CSSProperties = {
    width: HANDLE_SIZE_PX,
    height: HANDLE_SIZE_PX,
  }

  // Portal onto `.ds-chat` so free-float can chill over inbox / workspace / empty chrome.
  return createPortal(
    <div
      ref={handleRef}
      className={`aui-deep-avatar-3d-handle${dragging ? ' is-dragging' : ''}${pose.docked ? ' is-docked' : ' is-free'}`}
      data-character={solo}
      data-mood={mood}
      data-docked={pose.docked ? '1' : '0'}
      data-duo={duoOffset ? '1' : '0'}
      style={style}
      role="img"
      aria-label={`${name} 3D companion — office in the avatar frame; drag to undock`}
      title="Office lives in the avatar frame · drag to undock · drop near dock to snap home"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <canvas ref={canvasRef} className="aui-deep-avatar-3d-canvas" width={HANDLE_SIZE_PX} height={HANDLE_SIZE_PX} />
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
 * Reduced-motion + toggle gate. When companion is Both, mounts two independent
 * GLB overlays (boy + girl) that can chill or collaborate anywhere on `.ds-chat`.
 */
export function ChatDeepAvatar3DGate(props: GateProps) {
  const reduce = usePrefersReducedMotion()
  const active = props.enabled && !reduce
  const char = normalizeChatDeepAvatarCharacter(props.character)
  const solos = chatDeepAvatar3dSolosToMount(char)
  const duo = isChatDeepAvatarBothMode(char)
  const onActiveChange = props.onActiveChange
  const liveCount = useRef(0)
  const parentActiveRef = useRef(onActiveChange)
  parentActiveRef.current = onActiveChange

  // Stable per-solo reporter so overlay scene mounts aren't torn down each render.
  const reportRef = useRef((on: boolean) => {
    if (on) liveCount.current += 1
    else liveCount.current = Math.max(0, liveCount.current - 1)
    parentActiveRef.current?.(liveCount.current > 0)
  })

  useEffect(() => {
    if (!active) {
      liveCount.current = 0
      parentActiveRef.current?.(false)
    }
  }, [active])

  if (!active) return null

  return (
    <>
      {solos.map((solo) => (
        <ChatDeepAvatar3DOverlay
          key={solo}
          solo={solo}
          mood={props.mood}
          duoOffset={duo}
          dockRef={props.dockRef}
          layoutRef={props.layoutRef}
          onActiveChange={reportRef.current}
        />
      ))}
    </>
  )
}
