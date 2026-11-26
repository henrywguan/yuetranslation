/**
 * `#/chat` 3D companion chrome stub — transparent three.js character overlay.
 * Placeholder procedural mesh (or `deep.glb` when baked). Drag anywhere over
 * the chat layout; soft-snap home to bar/stage dock. GIF path remains fallback
 * for reduced-motion / WebGL failure / toggle off. GIF moods stay the 2D path.
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
  chatDeepAvatar3dStubTint,
  chatDeepAvatarGlbSrc,
  isChatDeepAvatar3dPointerBlocked,
  readChatDeepAvatar3dEnabled,
  readChatDeepAvatar3dPose,
  shouldSnapChatDeepAvatar3dHome,
  writeChatDeepAvatar3dEnabled,
  writeChatDeepAvatar3dPose,
  type ChatDeepAvatar3dPose,
} from '../../../lib/chatDeepAvatar3d'
import {
  normalizeChatDeepAvatarCharacter,
  type ChatDeepAvatarCharacterId,
  type ChatDeepAvatarMood,
} from '../../../lib/chatDeepAvatarCharacter'
import { useChatDeepAvatarDisplayName } from './ChatDeepAvatar'

const HANDLE_SIZE_PX = 112
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

/** Tiny chibi stand-in until Higgsfield `deep.glb` lands. */
function buildStubFigure(character: ChatDeepAvatarCharacterId): THREE.Group {
  const tint = chatDeepAvatar3dStubTint(character)
  const group = new THREE.Group()
  group.name = 'chat-avatar-3d-stub'

  const bodyMat = new THREE.MeshLambertMaterial({ color: tint })
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffe0c8 })
  const accentMat = new THREE.MeshLambertMaterial({
    color: character === 'girl' ? 0xf2d4e8 : 0x2a9d6e,
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
  root: THREE.Group
  figure: THREE.Object3D
  dispose: () => void
}

async function mountScene(
  canvas: HTMLCanvasElement,
  character: ChatDeepAvatarCharacterId,
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

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20)
  camera.position.set(0, 0.95, 3.4)
  camera.lookAt(0, 0.75, 0)

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444466, 1.05)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xffffff, 0.65)
  key.position.set(2.2, 4, 3)
  scene.add(key)

  const root = new THREE.Group()
  scene.add(root)

  let figure: THREE.Object3D = buildStubFigure(character)
  root.add(figure)

  const glbUrl = chatDeepAvatarGlbSrc(character)
  try {
    const loader = new GLTFLoader()
    const gltf = await new Promise<THREE.Group | null>((resolve) => {
      loader.load(
        glbUrl,
        (g) => resolve(g.scene),
        undefined,
        () => resolve(null),
      )
    })
    if (gltf) {
      const wrap = new THREE.Group()
      wrap.name = 'chat-avatar-3d-glb'
      wrap.add(gltf)
      wrap.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(wrap)
      const size = new THREE.Vector3()
      box.getSize(size)
      const h = size.y || 1
      const scale = 1.55 / h
      wrap.scale.setScalar(scale)
      wrap.position.y = -box.min.y * scale
      disposeObject3D(figure)
      root.remove(figure)
      figure = wrap
      root.add(figure)
    }
  } catch {
    /* keep procedural stub */
  }

  const dispose = () => {
    cancelAnimationFrame(raf)
    disposeObject3D(root)
    renderer.dispose()
  }

  let raf = 0
  let last = performance.now()
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    root.rotation.y += dt * 0.35
    root.position.y = Math.sin(now / 650) * 0.04
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return { renderer, scene, camera, root, figure, dispose }
}

type OverlayProps = {
  character: ChatDeepAvatarCharacterId
  mood: ChatDeepAvatarMood
  /** Bar / stage dock origin — home snap + follow when docked. */
  dockRef: RefObject<HTMLElement | null>
  /** Fallback layout; surface prefers `.ds-chat` so drag covers inbox/workspace. */
  layoutRef: RefObject<HTMLElement | null>
  /** When WebGL mounts successfully. */
  onActiveChange?: (active: boolean) => void
}

/**
 * Floating 3D companion. Parent mounts only when Companion → 3D is on and
 * reduced-motion is off. Pointer events live only on the handle.
 */
export function ChatDeepAvatar3DOverlay({
  character,
  mood,
  dockRef,
  layoutRef,
  onActiveChange,
}: OverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handleRef = useRef<HTMLDivElement | null>(null)
  const char = normalizeChatDeepAvatarCharacter(character)
  const name = useChatDeepAvatarDisplayName(char)
  const [pose, setPose] = useState<ChatDeepAvatar3dPose>(() => readChatDeepAvatar3dPose(char))
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
    const sync = () => setPose(readChatDeepAvatar3dPose(char))
    window.addEventListener(CHAT_DEEP_AVATAR_3D_POSE_EVENT, sync)
    return () => window.removeEventListener(CHAT_DEEP_AVATAR_3D_POSE_EVENT, sync)
  }, [char])

  useEffect(() => {
    setPose(readChatDeepAvatar3dPose(char))
  }, [char])

  useLayoutEffect(() => {
    setSurfaceEl(resolveSurface())
  }, [layoutRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    let bundle: SceneBundle | null = null
    void mountScene(canvas, char).then((b) => {
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
      setWebglOk(true)
      onActiveChange?.(true)
    })
    return () => {
      cancelled = true
      bundle?.dispose()
      onActiveChange?.(false)
    }
  }, [char, onActiveChange])

  // Follow dock origin while docked; keep free-float % otherwise.
  useLayoutEffect(() => {
    const surface = resolveSurface() || surfaceEl
    const handle = handleRef.current
    if (!surface || !handle) return
    setSurfaceEl(surface)

    const place = () => {
      const lr = surface.getBoundingClientRect()
      if (lr.width < 8 || lr.height < 8) return

      if (pose.docked) {
        const dock = dockRef.current
        if (dock) {
          const dr = dock.getBoundingClientRect()
          const cx = dr.left + dr.width / 2 - lr.left
          const cy = dr.top + dr.height * 0.42 - lr.top
          handle.style.left = `${cx}px`
          handle.style.top = `${cy}px`
          return
        }
      }
      handle.style.left = `${pose.x * lr.width}px`
      handle.style.top = `${pose.y * lr.height}px`
    }

    place()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null
    ro?.observe(surface)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [pose, dockRef, layoutRef, dragging, surfaceEl])

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
    const saved = writeChatDeepAvatar3dPose(char, next)
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
      data-character={char}
      data-mood={mood}
      data-docked={pose.docked ? '1' : '0'}
      style={style}
      role="img"
      aria-label={`${name} 3D companion — drag anywhere; drop near dock to snap home`}
      title="Drag anywhere · drop near dock to snap home"
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

type GateProps = OverlayProps & {
  /** Companion → 3D toggle (parent may pass hook value). */
  enabled: boolean
}

/** Reduced-motion + toggle gate — mounts overlay only when 3D should show. */
export function ChatDeepAvatar3DGate(props: GateProps) {
  const reduce = usePrefersReducedMotion()
  const active = props.enabled && !reduce
  const onActiveChange = props.onActiveChange
  useEffect(() => {
    if (!active) onActiveChange?.(false)
  }, [active, onActiveChange])
  if (!active) return null
  return <ChatDeepAvatar3DOverlay {...props} />
}
