import { useEffect, useRef } from 'react'
import {
  createOrbitalSphereRenderer,
  ensureOrbitalCreatorsFonts,
  ORBITAL_CREATORS_FONT_SAMPLE,
  ORBITAL_SPHERE_CREATORS,
  ORBITAL_SPHERE_DEFAULTS,
  type OrbitalSphereOptions,
} from './orbital-sphere-utils/orbitalSphereRenderer'
import './orbital-sphere.css'

export {
  ORBITAL_CREATORS_FONT_SAMPLE,
  ORBITAL_SPHERE_CREATORS,
  ORBITAL_SPHERE_DEFAULTS,
}
export type { OrbitalSphereOptions }

export type OrbitalSphereBackgroundProps = Partial<OrbitalSphereOptions> & {
  className?: string
}

/**
 * Full-bleed Three.js orbital particle sphere (adapted from ThreeUI Structure Flow).
 * Uses harbor/jade colors — no Tailwind / shadcn required.
 * Creators variant waits for Noto Sans (Chao tone letters) before baking glyph textures.
 */
export function OrbitalSphereBackground({
  className = '',
  ...props
}: OrbitalSphereBackgroundProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const optionsRef = useRef({ ...ORBITAL_SPHERE_DEFAULTS, ...props })
  optionsRef.current = { ...ORBITAL_SPHERE_DEFAULTS, ...props }
  const variant = optionsRef.current.variant

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return undefined

    let cancelled = false
    let frame = 0
    let visible = true
    let resizeObserver: ResizeObserver | null = null
    let intersection: IntersectionObserver | null = null
    let renderer: ReturnType<typeof createOrbitalSphereRenderer> | null = null

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const start = () => {
      if (cancelled || !host || !canvas) return
      // Geometry (glyphs / seals / palette) is built once per variant.
      renderer = createOrbitalSphereRenderer(canvas, () => optionsRef.current)

      const resize = () => {
        if (!renderer) return
        const bounds = host.getBoundingClientRect()
        renderer.resize(bounds.width, bounds.height)
        renderer.render()
      }

      const tick = () => {
        if (!renderer) return
        if (!reduceMotion) renderer.render()
        frame = visible && !document.hidden && !reduceMotion ? requestAnimationFrame(tick) : 0
      }

      resizeObserver = new ResizeObserver(resize)
      intersection = new IntersectionObserver(([entry]) => {
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
    }

    void (async () => {
      if (variant === 'creators') {
        await ensureOrbitalCreatorsFonts()
      }
      if (!cancelled) start()
    })()

    return () => {
      cancelled = true
      if (frame) cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      intersection?.disconnect()
      renderer?.dispose()
    }
  }, [variant])

  return (
    <div
      ref={hostRef}
      className={`orbital-sphere-bg${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      {/* DOM sample so Google Fonts subsets Chao tone letters for canvas sprites. */}
      {variant === 'creators' ? (
        <span className="orbital-sphere-font-probe" lang="en">
          {ORBITAL_CREATORS_FONT_SAMPLE}
        </span>
      ) : null}
      <canvas
        ref={canvasRef}
        style={{ filter: `hue-rotate(${optionsRef.current.hue}deg)` }}
      />
    </div>
  )
}
