import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ensureJyutping, hasHan, toJyutpingCached } from '../lib/jyutping'

export function CantoneseText({
  text,
  className,
  jyutpingClassName = 'jyutping',
  placeholder,
}: {
  text: string
  className?: string
  /** Kept for callers; popup uses shared `.jp-pop` styling. */
  jyutpingClassName?: string
  placeholder?: ReactNode
}) {
  const trimmed = text.trim()
  const reduce = useReducedMotion()
  const tipId = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const [jp, setJp] = useState(() => toJyutpingCached(trimmed))
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!trimmed || !hasHan(trimmed)) {
      setJp('')
      return
    }
    const cached = toJyutpingCached(trimmed)
    if (cached) {
      setJp(cached)
      return
    }
    void ensureJyutping(trimmed).then((v) => {
      if (!cancelled) setJp(v)
    })
    return () => {
      cancelled = true
    }
  }, [trimmed])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open])

  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const canJp = Boolean(jp)

  return (
    <span
      ref={wrapRef}
      className={`cantonese-block${canJp ? ' cantonese-block--hint' : ''}`}
      tabIndex={canJp ? 0 : undefined}
      aria-describedby={open && canJp ? tipId : undefined}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse' && canJp) setOpen(true)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setOpen(false)
      }}
      onFocus={() => {
        if (canJp) setOpen(true)
      }}
      onBlur={() => setOpen(false)}
      onClick={(e) => {
        if (!canJp) return
        e.stopPropagation()
        setOpen((v) => !v)
      }}
      onKeyDown={(e) => {
        if (!canJp) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOpen((v) => !v)
        } else if (e.key === 'Escape') {
          setOpen(false)
        }
      }}
    >
      <span className={className}>{trimmed}</span>
      <AnimatePresence>
        {open && canJp ? (
          <motion.span
            id={tipId}
            role="tooltip"
            className={`jp-pop ${jyutpingClassName}`.trim()}
            lang="en"
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {jp}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  )
}
