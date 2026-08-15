import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'
import { useReducedMotion } from '../lib/useReducedMotion'

function shouldUseSmoothScroll() {
  if (typeof window === 'undefined') return false
  // Skip Lenis when the machine is likely GPU/CPU constrained — native scroll
  // feels better than a smooth-scroll layer fighting dropped WebGL frames.
  const cores = navigator.hardwareConcurrency || 4
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const narrow = window.matchMedia('(max-width: 720px)').matches
  if (saveData || cores <= 4 || (coarse && narrow)) return false
  return true
}

/** Buttery smooth scrolling (Lenis) synced with GSAP ScrollTrigger. */
export function useSmoothScroll(enabled: boolean) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!enabled || reduced || !shouldUseSmoothScroll()) return

    const lenis = new Lenis({ duration: 0.95, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)

    const onRaf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(onRaf)
    // Keep lag smoothing so Lenis doesn't amplify stutter under WebGL load.
    gsap.ticker.lagSmoothing(500, 33)

    return () => {
      gsap.ticker.remove(onRaf)
      lenis.destroy()
    }
  }, [enabled, reduced])
}
