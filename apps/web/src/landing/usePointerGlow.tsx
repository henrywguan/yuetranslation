import { useRef, type PointerEvent as ReactPointerEvent } from 'react'

const GLOW_SEL = '.ln-pointer-glow'

/**
 * Aceternity-style Glare + Glowing Effect, without Tailwind.
 * Tracks the pointer across a scope and lights the nearest `.ln-pointer-glow` card.
 * Fine pointers only — touch leaves cards static so iPhone scroll stays clean.
 */
export function usePointerGlowScope<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null)
  const lastRef = useRef<HTMLElement | null>(null)

  const clear = () => {
    const last = lastRef.current
    if (!last) return
    last.classList.remove('is-glowing')
    lastRef.current = null
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return
    const scope = ref.current
    if (!scope) return
    const card = (e.target as HTMLElement | null)?.closest(GLOW_SEL) as HTMLElement | null
    if (!card || !scope.contains(card)) {
      clear()
      return
    }
    if (lastRef.current && lastRef.current !== card) {
      lastRef.current.classList.remove('is-glowing')
    }
    const r = card.getBoundingClientRect()
    const w = r.width || 1
    const h = r.height || 1
    card.style.setProperty('--glow-x', `${((e.clientX - r.left) / w) * 100}%`)
    card.style.setProperty('--glow-y', `${((e.clientY - r.top) / h) * 100}%`)
    card.classList.add('is-glowing')
    lastRef.current = card
  }

  const onPointerLeave = () => {
    clear()
  }

  return { ref, onPointerMove, onPointerLeave }
}

/** Shine + jade edge layers. Parent must have `.ln-pointer-glow`. */
export function PointerGlowLayers() {
  return (
    <>
      <span className="ln-pointer-glow-shine" aria-hidden="true" />
      <span className="ln-pointer-glow-edge" aria-hidden="true" />
    </>
  )
}
