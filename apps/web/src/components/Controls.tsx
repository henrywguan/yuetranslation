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

const DIR_SWITCH: {
  id: SpeakDirection
  copy: typeof ui.dirEnglish
  /** Hidden until Mandarin STT is wired. */
  hidden?: boolean
}[] = [
  { id: 'en', copy: ui.dirEnglish },
  { id: 'yue', copy: ui.dirJyutjyu },
  { id: 'cmn', copy: ui.dirMandarin, hidden: true },
]

function visibleDirection(d: SpeakDirection): 'en' | 'yue' {
  return d === 'yue' ? 'yue' : 'en'
}

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
  const dirValue = visibleDirection(speakDirection)

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
              <BiText copy={m.copy} size="sm" />
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
            <div className="opt-cell opt-dir">
              <span className="opt-kicker">
                <BiText copy={ui.direction} size="sm" />
              </span>
              {/* Radio switch adapted from Uiverse.io by Yaya12085 (MIT). */}
              <div
                className="dir-switch"
                role="radiogroup"
                aria-label={biPlain(ui.direction)}
              >
                {DIR_SWITCH.map((d) => (
                  <label
                    key={d.id}
                    className={`dir-switch-opt${d.hidden ? ' is-pending' : ''}`}
                    hidden={d.hidden}
                  >
                    <input
                      type="radio"
                      name="yue-speak-direction"
                      value={d.id}
                      checked={!d.hidden && dirValue === d.id}
                      disabled={d.hidden}
                      onChange={() => {
                        if (d.hidden) return
                        setSpeakDirection(d.id)
                      }}
                    />
                    <span className="dir-switch-name">
                      <BiText copy={d.copy} size="sm" />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <label className={`opt-cell opt-speak ${!canAutoSpeak ? 'disabled' : ''}`}>
            <span className="opt-kicker">
              <BiText copy={canAutoSpeak ? ui.autoSpeak : ui.autoSpeakPro} size="sm" />
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
              <BiText copy={ui.clear} size="sm" />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
