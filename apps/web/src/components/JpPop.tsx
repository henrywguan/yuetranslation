import { useLayoutEffect, useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ensureJyutpingSegs, hasHan, type JyutSeg } from '../lib/jyutping'
import { inkEase } from '../lib/motion'
import { JyutRuby } from './JyutRuby'
import type { RefObject } from 'react'

const VIEW_PAD = 10

function clampPopToViewport(pop: HTMLElement, anchor: HTMLElement) {
  const a = anchor.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxW = Math.max(120, vw - VIEW_PAD * 2)

  pop.style.position = 'fixed'
  pop.style.right = 'auto'
  pop.style.bottom = 'auto'
  pop.style.maxWidth = `${maxW}px`
  pop.style.left = `${VIEW_PAD}px`
  pop.style.top = `${VIEW_PAD}px`

  const pr = pop.getBoundingClientRect()
  let left = a.left
  let top = a.bottom + 8

  if (left + pr.width > vw - VIEW_PAD) left = vw - VIEW_PAD - pr.width
  if (left < VIEW_PAD) left = VIEW_PAD

  if (top + pr.height > vh - VIEW_PAD) {
    top = a.top - 8 - pr.height
  }
  if (top < VIEW_PAD) top = VIEW_PAD

  pop.style.left = `${Math.round(left)}px`
  pop.style.top = `${Math.round(top)}px`
}

/** Jyutping tooltip: per-character ruby (Jyutping above Han). Pass `han` for the Chinese phrase. */
export function JpPop({
  show,
  id,
  text: _text,
  han = '',
  className = '',
  anchorRef,
}: {
  show: boolean
  id: string
  text: string
  han?: string
  className?: string
  anchorRef?: RefObject<HTMLElement | null>
}) {
  const reduce = useReducedMotion()
  const popRef = useRef<HTMLSpanElement | null>(null)
  const [segs, setSegs] = useState<JyutSeg[]>([])
  const phrase = han.trim()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!show || !phrase) {
      setSegs([])
      return
    }
    let cancelled = false
    void ensureJyutpingSegs(phrase).then((next) => {
      if (!cancelled) setSegs(next)
    })
    return () => {
      cancelled = true
    }
  }, [show, phrase])

  useLayoutEffect(() => {
    if (!show) return
    const pop = popRef.current
    const anchor = anchorRef?.current
    if (!pop || !anchor) return

    const place = () => clampPopToViewport(pop, anchor)
    place()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null
    ro?.observe(pop)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [show, segs, phrase, anchorRef])

  if (!phrase || !hasHan(phrase)) return null

  const tip = (
    <AnimatePresence>
      {show ? (
        <motion.span
          ref={popRef}
          id={id}
          role="tooltip"
          className={`jp-pop jp-pop--portal jp-pop--ruby ${className}`.trim()}
          lang="en"
          initial={reduce ? false : { opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.22, ease: inkEase }}
        >
          <JyutRuby han={phrase} segs={segs} size="md" variant="pop" />
        </motion.span>
      ) : null}
    </AnimatePresence>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(tip, document.body)
}
