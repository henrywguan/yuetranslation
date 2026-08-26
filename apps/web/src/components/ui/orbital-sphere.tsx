import { useEffect, useRef } from 'react'
import {
  createOrbitalSphereRenderer,
  ORBITAL_SPHERE_DEFAULTS,
  type OrbitalSphereOptions,
} from './orbital-sphere-utils/orbitalSphereRenderer'
import './orbital-sphere.css'

export type OrbitalSphereBackgroundProps = Partial<OrbitalSphereOptions> & {
  className?: string
}

/**
 * Full-bleed Three.js orbital particle sphere (adapted from ThreeUI Structure Flow).
 * Uses harbor/jade colors — no Tailwind / shadcn required.
 */
export function OrbitalSphereBackground({
  className = '',
  ...props
}: OrbitalSphereBackgroundProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const optionsRef = useRef({ ...ORBITAL_SPHERE_DEFAULTS, ...props })
  optionsRef.current = { ...ORBITAL_SPHERE_DEFAULTS, ...props }

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const renderer = createOrbitalSphereRenderer(canvas, () => optionsRef.current)
    let frame = 0
    let visible = true

    const resize = () => {
      const bounds = host.getBoundingClientRect()
      renderer.resize(bounds.width, bounds.height)
      renderer.render()
    }

    const tick = () => {
      if (!reduceMotion) renderer.render()
      frame = visible && !document.hidden && !reduceMotion ? requestAnimationFrame(tick) : 0
    }

    const resizeObserver = new ResizeObserver(resize)
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true
      if (visible && !frame && !reduceMotion) frame = requestAnimationFrame(tick)
      if ((!visible || reduceMotion) && frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
    })

    resizeObserver.observe(host)
    intersection.observe(host)
    resize()
    if (!reduceMotion) frame = requestAnimationFrame(tick)
    else renderer.render()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersection.disconnect()
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      className={`orbital-sphere-bg${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        style={{ filter: `hue-rotate(${optionsRef.current.hue}deg)` }}
      />
    </div>
  )
}

export default OrbitalSphereBackground
