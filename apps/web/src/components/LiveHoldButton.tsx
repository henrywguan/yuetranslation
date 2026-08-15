import { motion } from 'framer-motion'
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { BiText } from './BiText'
import { useYueStore } from '../lib/store'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

/** Below this → tap (sticky listen). Above → hold-to-speak. */
const TAP_MS = 320

type Props = {
  /** Face panes pass en|yue to lock that speaker’s language for the turn. */
  side?: Lang
  /** Face panes are language-pure; Solo dock stays bilingual. */
  labelLang?: 'bi' | 'en' | 'zh'
  className?: string
}

function pickLabel(copy: Bi, labelLang: Props['labelLang']): string {
  if (labelLang === 'en') return copy.en
  if (labelLang === 'zh') return copy.zh
  return biPlain(copy)
}

/**
 * Shared hold/tap mic control — used by Solo dock and each Face-to-face pane.
 */
export function LiveHoldButton({ side, labelLang = 'bi', className = '' }: Props) {
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)
  const translating = useYueStore((s) => s.translating)
  const translatingTo = useYueStore((s) => s.translatingTo)
  const liveInteraction = useYueStore((s) => s.liveInteraction)
  const liveSide = useYueStore((s) => s.liveSide)
  const startHold = useYueStore((s) => s.startHold)
  const armTapMode = useYueStore((s) => s.armTapMode)
  const endHold = useYueStore((s) => s.endHold)
  const entitlement = useYueStore((s) => s.entitlement)
  const activePointer = useRef<number | null>(null)
  const downAt = useRef(0)
  const keyDownAt = useRef(0)

  const canLive = !entitlement || entitlement.allowed.live
  const isThisSide = !side || !liveSide || liveSide === side
  const activeHere = live && isThisSide
  const otherSideBusy = Boolean(side && live && liveSide && liveSide !== side)
  // Face: show thinking on the pane that will receive the translation.
  const thinkingHere = side
    ? translating && translatingTo === (side === 'en' ? 'yue' : 'en')
    : translating

  const liveCopy: Bi = thinkingHere
    ? ui.translating
    : activeHere || (status === 'listening' && isThisSide)
      ? status === 'speaking'
        ? ui.speaking
        : liveInteraction === 'tap'
          ? ui.tapToStop
          : ui.releaseWhenDone
      : ui.holdOrTapToSpeak

  const label = pickLabel(liveCopy, labelLang)
  const aria = labelLang === 'bi' ? biPlain(liveCopy) : label

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    if ((!canLive && !live) || otherSideBusy) return
    if (activePointer.current != null) return

    if (liveInteraction === 'tap' && isThisSide) {
      activePointer.current = e.pointerId
      e.currentTarget.setPointerCapture(e.pointerId)
      downAt.current = 0
      void endHold()
      return
    }

    activePointer.current = e.pointerId
    downAt.current = performance.now()
    e.currentTarget.setPointerCapture(e.pointerId)
    void startHold(side)
  }

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== e.pointerId) return
    activePointer.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (!downAt.current) return
    const heldFor = performance.now() - downAt.current
    downAt.current = 0
    if (heldFor < TAP_MS) armTapMode()
    else void endHold()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    if (e.repeat) return
    e.preventDefault()
    if ((!canLive && !live) || otherSideBusy) return
    if (liveInteraction === 'tap' && isThisSide) {
      keyDownAt.current = 0
      void endHold()
      return
    }
    keyDownAt.current = performance.now()
    void startHold(side)
  }

  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (!keyDownAt.current) return
    const heldFor = performance.now() - keyDownAt.current
    keyDownAt.current = 0
    if (heldFor < TAP_MS) armTapMode()
    else void endHold()
  }

  return (
    <motion.button
      type="button"
      className={`live-btn ${activeHere ? 'on' : ''} ${activeHere && liveInteraction === 'tap' ? 'tap' : ''} ${thinkingHere ? 'thinking' : ''} ${!canLive && !live ? 'blocked' : ''} ${otherSideBusy ? 'dimmed' : ''} ${className}`.trim()}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onContextMenu={(e) => e.preventDefault()}
      whileTap={{ scale: otherSideBusy ? 1 : 0.97 }}
      disabled={(!live && !canLive) || otherSideBusy}
      aria-label={aria}
      aria-pressed={activeHere}
    >
      <span className="live-dot" />
      {labelLang === 'bi' ? (
        <BiText copy={liveCopy} size="sm" layout="inline" />
      ) : (
        <span className="live-btn-label" lang={labelLang === 'zh' ? 'zh-HK' : 'en'}>
          {label}
        </span>
      )}
    </motion.button>
  )
}
