import { BiText } from './BiText'
import { LiveHoldButton } from './LiveHoldButton'
import { supportsLiveMic } from '../lib/langCapabilities'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import type { Mode } from '../lib/types'

const MODES: { id: Mode; copy: typeof ui.modeSolo }[] = [
  { id: 'solo', copy: ui.modeSolo },
  { id: 'conversation', copy: ui.modeFace },
  { id: 'camera', copy: ui.modeCamera },
]

/** Mode tabs + Solo live dock. Direction / auto-speak / clear live on the panes + account hub. */
export function Controls() {
  const mode = useYueStore((s) => s.mode)
  const setMode = useYueStore((s) => s.setMode)
  const speakDirection = useYueStore((s) => s.speakDirection)
  const soloUpperLang = useYueStore((s) => s.soloUpperLang)
  const soloLowerLang = useYueStore((s) => s.soloLowerLang)
  const primaryLanguage = useYueStore((s) => s.primaryLanguage)
  /** Cantonese primary: mode chrome is Chinese-only (English stays as mic hint). */
  const cantoPrimary = primaryLanguage === 'yue'

  const faceMode = mode === 'conversation'
  const cameraMode = mode === 'camera'
  // Mic only when the active Solo speak side is a voice language on a pane.
  // Text-only panes (Cebuano / Ilocano) are keyboard-led — no STT for that side.
  const micOnSoloPane =
    mode === 'solo' &&
    supportsLiveMic(speakDirection) &&
    (soloUpperLang === speakDirection || soloLowerLang === speakDirection)
  const showLiveDock = !faceMode && !cameraMode && micOnSoloPane

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
              <BiText copy={m.copy} size="sm" only={cantoPrimary ? 'zh' : undefined} hideJp />
            </button>
          ))}
        </div>
        {showLiveDock ? (
          <div className="live-row">
            <LiveHoldButton side={speakDirection} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
