import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'

/**
 * Page-level material atmosphere: fine grain + a very slow diagonal light sweep.
 * Sits above the glass field, below content — option E (no orbs).
 */
export function LandingAtmosphere() {
  const sweepRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const el = sweepRef.current
    if (!el) return

    let raf = 0
    let start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      // ~48s full cycle — almost imperceptible drift
      const x = ((t * 2.1) % 100)
      const y = ((t * 1.35) % 100)
      el.style.setProperty('--ln-sweep-x', `${x}%`)
      el.style.setProperty('--ln-sweep-y', `${y}%`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  return (
    <div className="ln-atmosphere" aria-hidden="true">
      <div className="ln-atmosphere-grain" />
      <div
        ref={sweepRef}
        className={`ln-atmosphere-sweep${reduced ? ' is-static' : ''}`}
      />
    </div>
  )
}
