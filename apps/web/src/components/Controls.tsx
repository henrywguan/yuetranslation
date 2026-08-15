import { motion } from 'framer-motion'
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { BiText } from './BiText'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import type { Mode, SpeakDirection } from '../lib/types'

const MODES: { id: Mode; copy: typeof ui.modeSolo }[] = [
  { id: 'solo', copy: ui.modeSolo },
  { id: 'conversation', copy: ui.modeFace },
  { id: 'text', copy: ui.modeText },
]

const DIRS: { id: SpeakDirection; label: string }[] = [
  { id: 'auto', label: biPlain(ui.dirAuto) },
  { id: 'en', label: 'EN → 粵' },
  { id: 'yue', label: '粵 → EN' },
]

/** Below this → tap (sticky listen). Above → hold-to-speak. */
const TAP_MS = 320

export function Controls() {
  const mode = useYueStore((s) => s.mode)
  const setMode = useYueStore((s) => s.setMode)
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)
  const translating = useYueStore((s) => s.translating)
  const liveInteraction = useYueStore((s) => s.liveInteraction)
  const startHold = useYueStore((s) => s.startHold)
  const armTapMode = useYueStore((s) => s.armTapMode)
  const endHold = useYueStore((s) => s.endHold)
  const speakDirection = useYueStore((s) => s.speakDirection)
  const setSpeakDirection = useYueStore((s) => s.setSpeakDirection)
  const autoSpeak = useYueStore((s) => s.autoSpeak)
  const setAutoSpeak = useYueStore((s) => s.setAutoSpeak)
  const entitlement = useYueStore((s) => s.entitlement)
  const clearHistory = useYueStore((s) => s.clearHistory)
  const activePointer = useRef<number | null>(null)
  const downAt = useRef(0)
  const keyDownAt = useRef(0)

  const canLive = !entitlement || entitlement.allowed.live
  const canAutoSpeak = Boolean(entitlement?.allowed.autoSpeak)
  const speakOn = autoSpeak && canAutoSpeak

  const liveCopy = translating
    ? ui.translating
    : live || status === 'listening'
      ? status === 'speaking'
        ? ui.speaking
        : liveInteraction === 'tap'
          ? ui.tapListening
          : ui.releaseWhenDone
      : ui.holdOrTapToSpeak

  const onHoldPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    if (!canLive && !live) return
    if (activePointer.current != null) return

    // Second tap while sticky-listening → finish early and translate.
    if (liveInteraction === 'tap') {
      activePointer.current = e.pointerId
      e.currentTarget.setPointerCapture(e.pointerId)
      downAt.current = 0
      void endHold()
      return
    }

    activePointer.current = e.pointerId
    downAt.current = performance.now()
    e.currentTarget.setPointerCapture(e.pointerId)
    void startHold()
  }

  const onHoldPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== e.pointerId) return
    activePointer.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    // Early finish already handled on pointerdown for tap mode.
    if (!downAt.current) return
    const heldFor = performance.now() - downAt.current
    downAt.current = 0
    if (heldFor < TAP_MS) armTapMode()
    else void endHold()
  }

  const onHoldKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    if (e.repeat) return
    e.preventDefault()
    if (!canLive && !live) return
    if (liveInteraction === 'tap') {
      keyDownAt.current = 0
      void endHold()
      return
    }
    keyDownAt.current = performance.now()
    void startHold()
  }

  const onHoldKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (!keyDownAt.current) return
    const heldFor = performance.now() - keyDownAt.current
    keyDownAt.current = 0
    if (heldFor < TAP_MS) armTapMode()
    else void endHold()
  }

  return (
    <div className="controls">
      <div className="dock">
        <div className="mode-tabs" role="tablist" aria-label={biPlain(ui.modeTablist)}>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              className={mode === m.id ? 'active' : ''}
              onClick={() => setMode(m.id)}
            >
              <BiText copy={m.copy} size="sm" layout="inline" />
            </button>
          ))}
        </div>
        {mode !== 'text' ? (
          <div className="live-row">
            <motion.button
              type="button"
              className={`live-btn ${live ? 'on' : ''} ${liveInteraction === 'tap' ? 'tap' : ''} ${translating ? 'thinking' : ''} ${!canLive && !live ? 'blocked' : ''}`}
              onPointerDown={onHoldPointerDown}
              onPointerUp={onHoldPointerUp}
              onPointerCancel={onHoldPointerUp}
              onKeyDown={onHoldKeyDown}
              onKeyUp={onHoldKeyUp}
              onContextMenu={(e) => e.preventDefault()}
              whileTap={{ scale: 0.97 }}
              disabled={!live && !canLive}
              aria-label={biPlain(liveCopy)}
              aria-pressed={live}
            >
              <span className="live-dot" />
              <BiText copy={liveCopy} size="sm" layout="inline" />
            </motion.button>
          </div>
        ) : null}

        <div className={`opt-row${mode === 'text' ? ' opt-row--compact' : ''}`}>
          {mode !== 'text' ? (
            <label className="opt-cell opt-dir">
              <span className="opt-kicker">
                <BiText copy={ui.direction} size="sm" layout="inline" />
              </span>
              <select
                value={speakDirection}
                onChange={(e) => setSpeakDirection(e.target.value as SpeakDirection)}
                aria-label={biPlain(ui.direction)}
              >
                {DIRS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className={`opt-cell opt-speak ${!canAutoSpeak ? 'disabled' : ''}`}>
            <span className="opt-kicker">
              <BiText copy={canAutoSpeak ? ui.autoSpeak : ui.autoSpeakPro} size="sm" layout="inline" />
            </span>
            <span className={`speak-switch${speakOn ? ' is-on' : ''}`}>
              <input
                type="checkbox"
                checked={speakOn}
                disabled={!canAutoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
              />
              <span className="speak-switch-ui" aria-hidden="true">
                <span className="speak-switch-thumb" />
              </span>
            </span>
          </label>

          <button type="button" className="opt-cell opt-clear" onClick={clearHistory}>
            <span className="opt-kicker">
              <BiText copy={ui.clear} size="sm" layout="inline" />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
