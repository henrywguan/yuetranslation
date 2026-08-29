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
      // ~32s cycle — readable drift without feeling busy
      const x = (t * 3.2) % 100
      const y = 12 + ((Math.sin(t * 0.22) + 1) / 2) * 58
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
      // Slightly stronger parallax so depth reads while scrolling
      const farY = Math.max(-220, Math.min(220, y * -0.14))
      const midY = Math.max(-380, Math.min(380, y * -0.32))
      const nearY = Math.max(-560, Math.min(560, y * -0.52))
      far.style.transform = `translate3d(0, ${farY}px, 0)`
      mid.style.transform = `translate3d(0, ${midY}px, 0)`
      near.style.transform = `translate3d(0, ${nearY}px, 0)`
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
      <div className={`ln-atmosphere-sheen${reduced ? ' is-static' : ''}`} />
    </div>
  )
}
