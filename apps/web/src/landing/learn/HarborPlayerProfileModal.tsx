import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { applyLookToProtagonist, type HarborLook } from './harborGear'
import { buildHarborProtagonist } from './harborProtagonist'

type Props = {
  open: boolean
  username: string
  look: HarborLook
  onClose: () => void
}

/**
 * Profile sheet for a remote sailor — username + spin/zoom 3D scout preview.
 */
export function HarborPlayerProfileModal({ open, username, look, onClose }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    dragging: false,
    lastX: 0,
    yaw: 0.4,
    distance: 3.2,
  })

  useEffect(() => {
    if (!open) return
    const host = hostRef.current
    if (!host) return

    const width = () => Math.max(280, host.clientWidth || 320)
    const height = () => Math.max(280, host.clientHeight || 320)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a1c24)
    const camera = new THREE.PerspectiveCamera(42, width() / height(), 0.1, 40)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setSize(width(), height(), false)
    host.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 1.15))
    const key = new THREE.DirectionalLight(0xfff5e6, 1.35)
    key.position.set(2.5, 4, 2)
    scene.add(key)
    const fill = new THREE.HemisphereLight(0xa8e8ff, 0x2a4a38, 0.55)
    scene.add(fill)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 24),
      new THREE.MeshLambertMaterial({ color: 0x143038, flatShading: true }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0.01
    scene.add(floor)

    const scout = buildHarborProtagonist({ pose: 'standing' })
    applyLookToProtagonist(scout, look)
    scout.position.y = 0
    scene.add(scout)

    let raf = 0
    let disposed = false
    const state = dragRef.current
    state.yaw = 0.4
    state.distance = 3.2

    const paint = () => {
      if (disposed) return
      raf = requestAnimationFrame(paint)
      if (!state.dragging) state.yaw += 0.008
      const d = state.distance
      camera.position.set(Math.sin(state.yaw) * d, 1.35 + d * 0.12, Math.cos(state.yaw) * d)
      camera.lookAt(0, 0.85, 0)
      renderer.render(scene, camera)
    }
    paint()

    const onResize = () => {
      const w = width()
      const h = height()
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null
    ro?.observe(host)

    const onDown = (e: PointerEvent) => {
      state.dragging = true
      state.lastX = e.clientX
      try {
        renderer.domElement.setPointerCapture(e.pointerId)
      } catch {
        /* optional */
      }
    }
    const onMove = (e: PointerEvent) => {
      if (!state.dragging) return
      const dx = e.clientX - state.lastX
      state.lastX = e.clientX
      state.yaw -= dx * 0.01
    }
    const onUp = (e: PointerEvent) => {
      state.dragging = false
      try {
        renderer.domElement.releasePointerCapture(e.pointerId)
      } catch {
        /* optional */
      }
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      state.distance = Math.min(5.5, Math.max(1.8, state.distance + e.deltaY * 0.004))
    }

    const el = renderer.domElement
    el.style.width = '100%'
    el.style.height = '100%'
    el.style.touchAction = 'none'
    el.style.cursor = 'grab'
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro?.disconnect()
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
      scout.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          const m = o.material
          if (Array.isArray(m)) m.forEach((x) => x.dispose())
          else m.dispose()
        }
      })
      floor.geometry.dispose()
      ;(floor.material as THREE.Material).dispose()
      renderer.dispose()
      if (el.parentElement === host) host.removeChild(el)
    }
  }, [open, look, username])

  if (!open) return null

  return (
    <div className="hq-player-modal" role="presentation" onClick={onClose}>
      <div
        className="hq-player-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${username} sailor profile`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="hq-player-head">
          <div>
            <p className="hq-player-kicker">Harbor sailor</p>
            <h2 className="hq-player-name">{username}</h2>
          </div>
          <button type="button" className="hq-btn hq-btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <div ref={hostRef} className="hq-player-viewport" aria-hidden="true" />
        <p className="hq-player-hint">Drag to spin · scroll to zoom</p>
      </div>
    </div>
  )
}
