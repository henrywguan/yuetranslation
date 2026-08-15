import { motion } from 'framer-motion'
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

export function Controls() {
  const mode = useYueStore((s) => s.mode)
  const setMode = useYueStore((s) => s.setMode)
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)
  const toggleLive = useYueStore((s) => s.toggleLive)
  const speakDirection = useYueStore((s) => s.speakDirection)
  const setSpeakDirection = useYueStore((s) => s.setSpeakDirection)
  const autoSpeak = useYueStore((s) => s.autoSpeak)
  const setAutoSpeak = useYueStore((s) => s.setAutoSpeak)
  const entitlement = useYueStore((s) => s.entitlement)
  const clearHistory = useYueStore((s) => s.clearHistory)

  const canLive = !entitlement || entitlement.allowed.live
  const canAutoSpeak = Boolean(entitlement?.allowed.autoSpeak)
  const speakOn = autoSpeak && canAutoSpeak

  const liveCopy = live
    ? status === 'speaking'
      ? ui.speaking
      : ui.listeningStop
    : ui.startListening

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
              <BiText copy={m.copy} size="sm" layout="inline" hideJp />
            </button>
          ))}
        </div>
        {mode !== 'text' ? (
          <div className="live-row">
            <motion.button
              type="button"
              className={`live-btn ${live ? 'on' : ''} ${!canLive && !live ? 'blocked' : ''}`}
              onClick={() => void toggleLive()}
              whileTap={{ scale: 0.97 }}
              disabled={!live && !canLive}
              aria-label={biPlain(liveCopy)}
            >
              <span className="live-dot" />
              <BiText copy={liveCopy} size="sm" layout="inline" hideJp />
            </motion.button>
          </div>
        ) : null}

        <div className={`opt-row${mode === 'text' ? ' opt-row--compact' : ''}`}>
          {mode !== 'text' ? (
            <label className="opt-cell opt-dir">
              <span className="opt-kicker">
                <BiText copy={ui.direction} size="sm" layout="inline" hideJp />
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
              <BiText copy={canAutoSpeak ? ui.autoSpeak : ui.autoSpeakPro} size="sm" layout="inline" hideJp />
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
              <BiText copy={ui.clear} size="sm" layout="inline" hideJp />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
