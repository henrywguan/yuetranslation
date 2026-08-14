import { useRef, type ReactNode, type PointerEvent } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'

type Props = {
  children: ReactNode
  onClick?: () => void
  className?: string
  strength?: number
}

export function MagneticButton({ children, onClick, className, strength = 0.28 }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const reduced = useReducedMotion()

  function onMove(e: PointerEvent<HTMLButtonElement>) {
    if (reduced || e.pointerType === 'touch') return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * strength
    const y = (e.clientY - (r.top + r.height / 2)) * strength
    el.style.transform = `translate(${x}px, ${y}px)`
  }

  function reset() {
    const el = ref.current
    if (el) el.style.transform = ''
  }

  return (
    <button
      ref={ref}
      type="button"
      className={`magnetic ${className ?? ''}`}
      onClick={onClick}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onPointerUp={reset}
    >
      {children}
    </button>
  )
}
