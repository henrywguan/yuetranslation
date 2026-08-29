import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'

/**
 * Continuous page atmosphere: grain + light sweep + soft parallax depth layers.
 * One field for the whole landing — no per-section wash cutoffs.
 */
export function LandingAtmosphere() {
  const sweepRef = useRef<HTMLDivElement>(null)
  const farRef = useRef<HTMLDivElement>(null)
  const midRef = useRef<HTMLDivElement>(null)
  const nearRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const el = sweepRef.current
    if (!el) return

    let raf = 0
    let start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      const x = (t * 2.1) % 100
      const y = (t * 1.35) % 100
      el.style.setProperty('--ln-sweep-x', `${x}%`)
      el.style.setProperty('--ln-sweep-y', `${y}%`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  useEffect(() => {
    if (reduced) return
    const far = farRef.current
    const mid = midRef.current
    const near = nearRef.current
    if (!far || !mid || !near) return

    let raf = 0
    let latest = 0
    let ticking = false

    const apply = () => {
      ticking = false
      const y = latest
      // Depth parallax — farther layers move less; continuous across the page.
      far.style.transform = `translate3d(0, ${y * -0.12}px, 0)`
      mid.style.transform = `translate3d(0, ${y * -0.28}px, 0)`
      near.style.transform = `translate3d(0, ${y * -0.48}px, 0)`
    }

    const onScroll = () => {
      latest = window.scrollY || document.documentElement.scrollTop || 0
      if (!ticking) {
        ticking = true
        raf = requestAnimationFrame(apply)
      }
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div className="ln-atmosphere" aria-hidden="true">
      <div
        ref={farRef}
        className={`ln-parallax-layer ln-parallax-layer--far${reduced ? ' is-static' : ''}`}
      />
      <div
        ref={midRef}
        className={`ln-parallax-layer ln-parallax-layer--mid${reduced ? ' is-static' : ''}`}
      />
      <div
        ref={nearRef}
        className={`ln-parallax-layer ln-parallax-layer--near${reduced ? ' is-static' : ''}`}
      />
      <div className="ln-atmosphere-grain" />
      <div
        ref={sweepRef}
        className={`ln-atmosphere-sweep${reduced ? ' is-static' : ''}`}
      />
    </div>
  )
}
