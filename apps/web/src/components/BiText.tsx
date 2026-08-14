import { useEffect, useId, useRef, useState, type ElementType, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { Bi } from '../lib/uiCopy'
import { biPlain } from '../lib/uiCopy'

type BiTextProps = {
  copy: Bi
  /** stack = EN above ZH (default); inline = EN then ZH on one row */
  layout?: 'inline' | 'stack'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  as?: ElementType
  after?: ReactNode
  /** Skip Jyutping popup entirely */
  hideJp?: boolean
}

/**
 * Minimal bilingual label: English above Chinese.
 * Jyutping stays hidden until hover / focus / tap on the Chinese.
 */
export function BiText({
  copy,
  layout = 'stack',
  size = 'md',
  className = '',
  as: Tag = 'span',
  after,
  hideJp = false,
}: BiTextProps) {
  const reduce = useReducedMotion()
  const tipId = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const canJp = !hideJp && Boolean(copy.jp)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open])

  return (
    <Tag className={`bi bi--${layout} bi--${size} ${className}`.trim()} title={biPlain(copy)}>
      <span className="bi-en">{copy.en}</span>
      <span
        ref={wrapRef}
        className={`bi-zh-wrap${canJp ? ' bi-zh-wrap--hint' : ''}`}
        lang="zh-HK"
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
          // Don't block parent buttons (mode tabs / CTAs); hover handles desktop.
          if (e.currentTarget.closest('button, a')) return
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
        <span className="bi-zh">{copy.zh}</span>
        <AnimatePresence>
          {open && canJp ? (
            <motion.span
              id={tipId}
              role="tooltip"
              className="jp-pop"
              lang="en"
              initial={reduce ? false : { opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {copy.jp}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>
      {after}
    </Tag>
  )
}
