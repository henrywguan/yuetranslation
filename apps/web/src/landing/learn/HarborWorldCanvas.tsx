import { useEffect, useRef } from 'react'
import type { HarborLook } from './harborGear'
import {
  createHarborWorld,
  type HarborHue,
  type HarborVisitableId,
  type HarborWorldHandle,
} from './harborWorld'

type Props = {
  progress: number
  flash: 'ok' | 'no' | null
  hue: HarborHue
  reducedMotion: boolean
  look: HarborLook
  onVisitable?: (id: HarborVisitableId | null) => void
  className?: string
}

/** Full-bleed WebGL river voyage behind the Harbor Quest HUD. */
export function HarborWorldCanvas({
  progress,
  flash,
  hue,
  reducedMotion,
  look,
  onVisitable,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<HarborWorldHandle | null>(null)
  const onVisitableRef = useRef(onVisitable)
  onVisitableRef.current = onVisitable

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const world = createHarborWorld(canvas, {
      hue,
      reducedMotion,
      look,
      onVisitable: (id) => onVisitableRef.current?.(id),
    })
    worldRef.current = world

    const onResize = () => world.resize()
    window.addEventListener('resize', onResize)
    // Stage height changes when the OSRS chat strip docks — observe the parent box.
    const box = canvas.parentElement
    const ro =
      typeof ResizeObserver !== 'undefined' && box
        ? new ResizeObserver(() => world.resize())
        : null
    ro?.observe(box ?? canvas)
    // Layout may settle after mount (fullscreen HUD / strip toggle).
    requestAnimationFrame(() => world.resize())

    return () => {
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
      world.dispose()
      worldRef.current = null
    }
    // Recreate only when canvas mounts; hue / motion / flash / look sync via setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  return (
    <canvas
      ref={canvasRef}
      className={className ?? 'hq-world-canvas'}
      aria-hidden="true"
    />
  )
}
