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
    let onVisibility: (() => void) | null = null

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

      const schedule = () => {
        if (cancelled || !renderer || reduceMotion || !visible || document.hidden || frame) return
        frame = requestAnimationFrame(tick)
      }

      const tick = () => {
        frame = 0
        if (!renderer || cancelled) return
        renderer.render()
        schedule()
      }

      onVisibility = () => {
        if (document.hidden) {
          if (frame) cancelAnimationFrame(frame)
          frame = 0
          return
        }
        schedule()
      }

      resizeObserver = new ResizeObserver(resize)
      intersection = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? true
        if (visible) schedule()
        else if (frame) {
          cancelAnimationFrame(frame)
          frame = 0
        }
      })

      resizeObserver.observe(host)
      intersection.observe(host)
      document.addEventListener('visibilitychange', onVisibility)
      resize()
      if (!reduceMotion) schedule()
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
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility)
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
        style={{ filter: `hue-rotate(${props.hue ?? ORBITAL_SPHERE_DEFAULTS.hue}deg)` }}
      />
    </div>
  )
}
