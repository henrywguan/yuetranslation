import { motion } from 'framer-motion'
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { BiText } from './BiText'
import { useYueStore } from '../lib/store'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import { unlockMicrophone, stopMediaStream } from '../lib/mediaAccess'
import type { Lang } from '../lib/types'

/**
 * Press shorter than this → sticky tap (keep listening after release).
 * Press longer → hold-to-speak (release ends the turn).
 * Slightly forgiving so normal taps aren’t treated as hold-releases.
 */
const HOLD_THRESHOLD_MS = 520

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
 * Shared mic control — Solo dock + each Face-to-face pane.
 *
 * Modes:
 * 1) Tap → speak → sentence pause auto-stops → translate
 * 2) Tap → speak → tap again to stop → translate
 * 3) Hold → speak → release → translate
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
  /** True after a sticky-tap “stop” press so pointerup doesn’t re-arm. */
  const stopTapRef = useRef(false)

  const canLive = !entitlement || entitlement.allowed.live
  const isThisSide = !side || !liveSide || liveSide === side
  const otherSideBusy = Boolean(side && live && liveSide && liveSide !== side)
  // Keep the button “on” while sticky tap is armed even before `live` flips true.
  const armedHere =
    isThisSide && (liveInteraction === 'hold' || liveInteraction === 'tap' || (live && isThisSide))
  const stickyHere = isThisSide && liveInteraction === 'tap'
  const holdHere = isThisSide && liveInteraction === 'hold'

  // Face: initiating pane’s button shows translating while the other pane gets the loader.
  const thinkingHere = side
    ? translating && translatingTo === (side === 'en' ? 'yue' : 'en')
    : translating

  const liveCopy: Bi = thinkingHere
    ? ui.translating
    : stickyHere
      ? ui.tapListening
      : holdHere || (armedHere && status === 'listening')
        ? status === 'speaking'
          ? ui.speaking
          : ui.releaseWhenDone
        : ui.holdOrTapToSpeak

  const label = pickLabel(liveCopy, labelLang)
  const aria = labelLang === 'bi' ? biPlain(liveCopy) : label

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    if ((!canLive && !live && !stickyHere) || otherSideBusy) return
    if (activePointer.current != null) return

    // Mode 2: second tap while sticky-listening → stop + translate.
    if (stickyHere) {
      stopTapRef.current = true
      activePointer.current = e.pointerId
      e.currentTarget.setPointerCapture(e.pointerId)
      downAt.current = 0
      void endHold()
      return
    }

    stopTapRef.current = false
    activePointer.current = e.pointerId
    downAt.current = performance.now()
    e.currentTarget.setPointerCapture(e.pointerId)
    // Kick mic permission in this gesture before startHold's awaits (iOS).
    void unlockMicrophone().then((stream) => {
      stopMediaStream(stream)
    })
    void startHold(side)
  }

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== e.pointerId) return
    activePointer.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (stopTapRef.current) {
      stopTapRef.current = false
      return
    }
    if (!downAt.current) return
    const heldFor = performance.now() - downAt.current
    downAt.current = 0
    if (heldFor < HOLD_THRESHOLD_MS) {
      // Modes 1–2: sticky tap — keep listening after release.
      armTapMode()
    } else {
      // Mode 3: hold-to-speak — release ends the turn.
      void endHold()
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    if (e.repeat) return
    e.preventDefault()
    if ((!canLive && !live && !stickyHere) || otherSideBusy) return
    if (stickyHere) {
      stopTapRef.current = true
      keyDownAt.current = 0
      void endHold()
      return
    }
    stopTapRef.current = false
    keyDownAt.current = performance.now()
    void startHold(side)
  }

  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (stopTapRef.current) {
      stopTapRef.current = false
      return
    }
    if (!keyDownAt.current) return
    const heldFor = performance.now() - keyDownAt.current
    keyDownAt.current = 0
    if (heldFor < HOLD_THRESHOLD_MS) armTapMode()
    else void endHold()
  }

  return (
    <motion.button
      type="button"
      className={`live-btn ${armedHere ? 'on' : ''} ${stickyHere ? 'tap' : ''} ${thinkingHere ? 'thinking' : ''} ${!canLive && !live && !stickyHere ? 'blocked' : ''} ${otherSideBusy ? 'dimmed' : ''} ${className}`.trim()}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onContextMenu={(e) => e.preventDefault()}
      whileTap={{ scale: otherSideBusy ? 1 : 0.97 }}
      disabled={(!live && !canLive && !stickyHere) || otherSideBusy}
      aria-label={aria}
      aria-pressed={armedHere}
    >
      <span className="live-dot" />
      {labelLang === 'bi' ? (
        <BiText copy={liveCopy} size="sm" />
      ) : (
        <span className="live-btn-label" lang={labelLang === 'zh' ? 'zh-HK' : 'en'}>
          {label}
        </span>
      )}
    </motion.button>
  )
}
