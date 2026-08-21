import { useEffect, useRef, type ReactNode } from 'react'
import { gsap } from './gsap'
import { useReducedMotion } from '../lib/useReducedMotion'

type RevealProps = {
  children: ReactNode
  className?: string
  y?: number
  /** Horizontal drift on enter (negative = from left, positive = from right). */
  x?: number
  delay?: number
  /** Stagger direct children instead of animating the wrapper as one block. */
  stagger?: number
}

export function Reveal({ children, className, y = 26, x = 0, delay = 0, stagger }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (reduced) {
      gsap.set(stagger ? el.children : el, { opacity: 1, y: 0, x: 0 })
      return
    }

    const ctx = gsap.context(() => {
      const targets = stagger ? el.children : el
      gsap.fromTo(
        targets,
        { opacity: 0, y, x },
        {
          opacity: 1,
          y: 0,
          x: 0,
          duration: 0.95,
          delay,
          ease: 'power3.out',
          stagger: stagger ?? 0,
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
        },
      )
    }, ref)

    return () => ctx.revert()
  }, [reduced, y, x, delay, stagger])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
