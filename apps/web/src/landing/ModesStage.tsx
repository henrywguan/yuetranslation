import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from '../components/BiText'
import { TranslateThinking } from '../components/TranslateThinking'
import { inkEase } from '../lib/motion'
import { openTones } from '../lib/siteLinks'
import { useReducedMotion } from '../lib/useReducedMotion'
import { ui, type Bi } from '../lib/uiCopy'

type ModeId = 'solo' | 'conversation' | 'text'

const MODES: { id: ModeId; title: Bi; line: Bi }[] = [
  { id: 'solo', title: ui.modeSolo, line: ui.modeSoloLine },
  { id: 'conversation', title: ui.modeFaceShort, line: ui.modeFaceLine },
  { id: 'text', title: ui.modeText, line: ui.modeTextLine },
]

const AUTO_MS = 6800

/** Cinematic modes stage — one phone preview, three quiet selectors, almost no copy. */
export function ModesStage() {
  const reduce = useReducedMotion()
  const [mode, setMode] = useState<ModeId>('solo')
  const [paused, setPaused] = useState(false)
  const active = MODES.find((m) => m.id === mode) || MODES[0]

  useEffect(() => {
    if (reduce || paused) return
    const t = window.setTimeout(() => {
      const i = MODES.findIndex((m) => m.id === mode)
      setMode(MODES[(i + 1) % MODES.length]!.id)
    }, AUTO_MS)
    return () => window.clearTimeout(t)
  }, [mode, paused, reduce])

  return (
    <div
      className="ln-modes-stage"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="ln-modes-rail" role="tablist" aria-label={ui.modesKicker.en}>
        {MODES.map((m) => {
          const on = m.id === mode
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`ln-modes-tab${on ? ' is-active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <BiText copy={m.title} size="sm" hideJp />
            </button>
          )
        })}
      </div>

      <div className="ln-modes-frame" aria-live="polite">
        <div className="ln-modes-phone" data-mode={mode}>
          <div className="ln-modes-phone-notch" aria-hidden="true" />
          <div className="ln-modes-phone-screen">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                className="ln-modes-scene"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.38, ease: inkEase }}
              >
                {mode === 'solo' ? <SoloMicro reduce={reduce} /> : null}
                {mode === 'conversation' ? <ConversationMicro reduce={reduce} /> : null}
                {mode === 'text' ? <TextMicro reduce={reduce} /> : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <p className="ln-modes-line">
        <BiText copy={active.line} size="sm" hideJp />
      </p>
      <button type="button" className="ln-modes-tones-chip" onClick={() => openTones()}>
        <BiText copy={ui.modesTonesChip} size="sm" hideJp />
      </button>
    </div>
  )
}

function useLoopStep(steps: number, periodMs: number, reduce: boolean) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (reduce) {
      setStep(steps - 1)
      return
    }
    setStep(0)
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % steps)
    }, periodMs)
    return () => window.clearInterval(id)
  }, [steps, periodMs, reduce])
  return step
}

function MicGlyph({ active }: { active?: boolean }) {
  return (
    <span className={`ln-micro-mic${active ? ' is-active' : ''}`} aria-hidden="true">
      <span className="ln-micro-mic-ring" />
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path
          fill="currentColor"
          d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"
        />
      </svg>
      {active ? <span className="ln-micro-thumb" /> : null}
    </span>
  )
}

function SpeakGlyph({ active }: { active?: boolean }) {
  return (
    <span className={`ln-micro-speak${active ? ' is-active' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="14" height="14">
        <path
          fill="currentColor"
          d="M4.5 9.25v5.5c0 .69.56 1.25 1.25 1.25H8.1l4.05 3.24a.9.9 0 0 0 1.45-.71V6.47a.9.9 0 0 0-1.45-.71L8.1 9H5.75c-.69 0-1.25.56-1.25 1.25Z"
        />
      </svg>
    </span>
  )
}

/** Solo: thumb holds mic → English → Cantonese + quiet Jyutping. */
function SoloMicro({ reduce }: { reduce: boolean }) {
  const step = useLoopStep(5, 1200, reduce)
  const holding = step === 1
  const showEn = step >= 2
  const showYue = step >= 3

  return (
    <div className="ln-micro ln-micro--solo">
      <div className="ln-micro-solo-body">
        <AnimatePresence mode="wait">
          {showEn ? (
            <motion.p
              key="en"
              className="ln-micro-en"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: inkEase }}
            >
              Good morning
            </motion.p>
          ) : (
            <motion.p
              key="hint"
              className="ln-micro-hint"
              initial={false}
              animate={{ opacity: holding ? 0.6 : 0.38 }}
            >
              {holding ? 'Listening…' : 'Tap/Hold to speak'}
            </motion.p>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showYue ? (
            <motion.div
              key="yue"
              className="ln-micro-yue"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: inkEase }}
            >
              <span className="ln-micro-han" lang="zh-HK">
                早晨
              </span>
              <span className="ln-micro-jp" lang="en">
                zou2 san4
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="ln-micro-dock">
        <MicGlyph active={holding} />
      </div>
    </div>
  )
}

/**
 * Conversation: split / rotated phone — both languages talking to each other.
 * Friend (top, rotated) speaks 粵; you (bottom) speak English — alternating.
 */
function ConversationMicro({ reduce }: { reduce: boolean }) {
  const step = useLoopStep(7, 900, reduce)
  // 0 ready → 1 you EN → 2 friend 粵 replies → 3 friend speak → 4 you EN reply → 5–6 both live
  const youOpen = step >= 1
  const friendReply = step >= 2
  const friendSpeaking = step === 3 || step === 6
  const youReply = step >= 4
  const youSpeaking = step === 1 || step === 5

  return (
    <div className="ln-micro ln-micro--face">
      <div
        className={`ln-micro-face-pane ln-micro-face-pane--friend${friendSpeaking ? ' is-talking' : ''}${friendReply ? ' has-line' : ''}`}
      >
        <div className="ln-micro-face-inner">
          <p className="ln-micro-face-label" lang="zh-HK">
            朋友
          </p>
          <AnimatePresence mode="wait">
            {friendReply ? (
              <motion.div
                key="friend"
                className="ln-micro-yue ln-micro-yue--face"
                initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: inkEase }}
              >
                <span className="ln-micro-han" lang="zh-HK">
                  早晨
                </span>
                <span className="ln-micro-jp" lang="en">
                  zou2 san4
                </span>
              </motion.div>
            ) : (
              <motion.p
                key="friend-wait"
                className="ln-micro-hint"
                lang="zh-HK"
                initial={false}
                animate={{ opacity: 0.4 }}
              >
                聽緊…
              </motion.p>
            )}
          </AnimatePresence>
          <SpeakGlyph active={friendSpeaking} />
        </div>
      </div>

      <div className="ln-micro-face-gutter" aria-hidden="true">
        <span />
      </div>

      <div
        className={`ln-micro-face-pane ln-micro-face-pane--you${youSpeaking ? ' is-talking' : ''}${youOpen ? ' has-line' : ''}`}
      >
        <div className="ln-micro-face-inner">
          <p className="ln-micro-face-label">You</p>
          <AnimatePresence mode="wait">
            {youReply ? (
              <motion.p
                key="you-b"
                className="ln-micro-en"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: inkEase }}
              >
                Nice to meet you
              </motion.p>
            ) : youOpen ? (
              <motion.p
                key="you-a"
                className="ln-micro-en"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: inkEase }}
              >
                Good morning
              </motion.p>
            ) : (
              <p key="you-hint" className="ln-micro-hint">
                Your side
              </p>
            )}
          </AnimatePresence>
          <SpeakGlyph active={youSpeaking} />
        </div>
      </div>
    </div>
  )
}

/** Text: type → TranslateThinking (same loader as the app) → result with Jyutping. */
const TEXT_SAMPLE = 'Calligraphy'

function TextMicro({ reduce }: { reduce: boolean }) {
  const [chars, setChars] = useState(reduce ? TEXT_SAMPLE.length : 0)
  const [phase, setPhase] = useState<'type' | 'thinking' | 'result'>(reduce ? 'result' : 'type')

  useEffect(() => {
    if (reduce) return
    setChars(0)
    setPhase('type')
    let i = 0
    let thinkTimer = 0
    const typeId = window.setInterval(() => {
      i += 1
      setChars(i)
      if (i >= TEXT_SAMPLE.length) {
        window.clearInterval(typeId)
        setPhase('thinking')
        thinkTimer = window.setTimeout(() => setPhase('result'), 2000)
      }
    }, 95)
    return () => {
      window.clearInterval(typeId)
      window.clearTimeout(thinkTimer)
    }
  }, [reduce])

  return (
    <div className="ln-micro ln-micro--text">
      <div className="ln-micro-input" aria-hidden="true">
        <span className="ln-micro-input-text">
          {TEXT_SAMPLE.slice(0, chars)}
          {phase === 'type' ? <span className="ln-micro-caret" /> : null}
        </span>
      </div>
      <AnimatePresence mode="wait">
        {phase === 'thinking' ? (
          <motion.div
            key="thinking"
            className="ln-micro-thinking"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.28, ease: inkEase }}
          >
            <TranslateThinking className="ln-micro-tt" />
          </motion.div>
        ) : null}
        {phase === 'result' ? (
          <motion.div
            key="result"
            className="ln-micro-yue"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: inkEase }}
          >
            <span className="ln-micro-han" lang="zh-HK">
              書法
            </span>
            <span className="ln-micro-jp" lang="en">
              syu1 faat3
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
