import { useEffect, useRef } from 'react'
import { gsap } from './gsap'
import { useReducedMotion } from '../lib/useReducedMotion'

export type SectionWashTone = 'jade' | 'blue' | 'cool' | 'deep'

/**
 * Soft alternating band wash behind section content.
 * Parallax is subtle (scrub) so foreground stays the focus — option A.
 */
export function SectionWash({
  tone,
  className,
}: {
  tone: SectionWashTone
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return

    const parent = el.parentElement
    if (!parent) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: -12 },
        {
          yPercent: 12,
          ease: 'none',
          scrollTrigger: {
            trigger: parent,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.55,
          },
        },
      )
    }, parent)

    return () => ctx.revert()
  }, [reduced, tone])

  return (
    <div
      ref={ref}
      className={
        className
          ? `ln-section-wash ln-section-wash--${tone} ${className}`
          : `ln-section-wash ln-section-wash--${tone}`
      }
      aria-hidden="true"
    />
  )
}
