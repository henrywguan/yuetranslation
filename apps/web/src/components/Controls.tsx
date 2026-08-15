import { BiText } from './BiText'
import { LiveHoldButton } from './LiveHoldButton'
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
  const speakDirection = useYueStore((s) => s.speakDirection)
  const setSpeakDirection = useYueStore((s) => s.setSpeakDirection)
  const autoSpeak = useYueStore((s) => s.autoSpeak)
  const setAutoSpeak = useYueStore((s) => s.setAutoSpeak)
  const entitlement = useYueStore((s) => s.entitlement)
  const clearHistory = useYueStore((s) => s.clearHistory)

  const canAutoSpeak = Boolean(entitlement?.allowed.autoSpeak)
  const speakOn = autoSpeak && canAutoSpeak
  const faceMode = mode === 'conversation'
  const showLiveDock = mode !== 'text' && !faceMode
  const showDirection = mode !== 'text' && !faceMode

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
        {showLiveDock ? (
          <div className="live-row">
            <LiveHoldButton />
          </div>
        ) : null}

        <div
          className={`opt-row${mode === 'text' || faceMode ? ' opt-row--compact' : ''}${faceMode ? ' opt-row--face' : ''}`}
        >
          {showDirection ? (
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
