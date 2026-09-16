import { useEffect, useRef } from 'react'
import type { HarborLook } from './harborGear'
import type { HarborAppearance, HarborGender } from './harborAppearance'
import type { HarborRemotePlayer } from './harborPresence'
import {
  createHarborWorld,
  type HarborHue,
  type HarborRealmId,
  type HarborVisitableId,
  type HarborWorldHandle,
} from './harborWorld'

type Props = {
  progress: number
  flash: 'ok' | 'no' | null
  hue: HarborHue
  reducedMotion: boolean
  look: HarborLook
  gender?: HarborGender
  appearance?: HarborAppearance
  realm?: HarborRealmId
  /** Pause simulation (chart / heavy overlays) — raf stays alive for a cheap resume. */
  paused?: boolean
  onVisitable?: (id: HarborVisitableId | null) => void
  /** Signed-in multiplayer: remote sailors to render. */
  remotePlayers?: HarborRemotePlayer[]
  /** Local nametag (all sailors show a name above their head). */
  localUsername?: string
  /** Tap a remote sailor → profile modal. */
  onRemotePlayerSelect?: (userId: string) => void
  /** Parent access for presence broadcast (getLocalPose). */
  worldApiRef?: React.MutableRefObject<HarborWorldHandle | null>
  className?: string
}

/** Full-bleed WebGL river voyage behind the Harbor Quest HUD. */
export function HarborWorldCanvas({
  progress,
  flash,
  hue,
  reducedMotion,
  look,
  gender,
  appearance,
  realm = 'river',
  paused = false,
  onVisitable,
  remotePlayers,
  localUsername,
  onRemotePlayerSelect,
  worldApiRef,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<HarborWorldHandle | null>(null)
  const onVisitableRef = useRef(onVisitable)
  onVisitableRef.current = onVisitable
  const onRemoteSelectRef = useRef(onRemotePlayerSelect)
  onRemoteSelectRef.current = onRemotePlayerSelect

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const world = createHarborWorld(canvas, {
      hue,
      reducedMotion,
      look,
      gender,
      appearance,
      realm,
      onVisitable: (id) => onVisitableRef.current?.(id),
      onRemotePlayerSelect: (userId) => onRemoteSelectRef.current?.(userId),
    })
    worldRef.current = world
    if (worldApiRef) worldApiRef.current = world

    let resizeRaf = 0
    const scheduleResize = () => {
      if (resizeRaf) return
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        world.resize()
      })
    }
    window.addEventListener('resize', scheduleResize)
    // Stage height changes when the OSRS chat strip docks — observe the parent box.
    const box = canvas.parentElement
    const ro =
      typeof ResizeObserver !== 'undefined' && box
        ? new ResizeObserver(scheduleResize)
        : null
    ro?.observe(box ?? canvas)
    // Layout may settle after mount (fullscreen HUD / strip toggle).
    requestAnimationFrame(() => world.resize())

    return () => {
      window.removeEventListener('resize', scheduleResize)
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      ro?.disconnect()
      world.dispose()
      worldRef.current = null
      if (worldApiRef) worldApiRef.current = null
    }
    // Recreate when realm changes (Campaign 1 river vs Campaign 2 bamboo garden).
    // Hue / motion / flash / look still sync via setters between recreations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realm])

  useEffect(() => {
    worldRef.current?.setProgress(progress)
  }, [progress])

  useEffect(() => {
    worldRef.current?.setFlash(flash)
  }, [flash])

  useEffect(() => {
    worldRef.current?.setHue(hue)
  }, [hue])

  useEffect(() => {
    worldRef.current?.setReducedMotion(reducedMotion)
  }, [reducedMotion])

  useEffect(() => {
    worldRef.current?.setLook(look)
  }, [look])

  useEffect(() => {
    worldRef.current?.setCharacter({ gender, appearance })
  }, [gender, appearance])

  useEffect(() => {
    worldRef.current?.setPaused(paused)
  }, [paused])

  useEffect(() => {
    worldRef.current?.setRemotePlayers(remotePlayers ?? [])
  }, [remotePlayers])

  useEffect(() => {
    if (localUsername) worldRef.current?.setLocalUsername(localUsername)
  }, [localUsername])

  return (
    <canvas
      ref={canvasRef}
      className={className ?? 'hq-world-canvas'}
      aria-hidden="true"
    />
  )
}
