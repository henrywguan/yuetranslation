import { BiText } from './BiText'
import { LiveHoldButton } from './LiveHoldButton'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import type { Mode, SpeakDirection } from '../lib/types'

const MODES: { id: Mode; copy: typeof ui.modeSolo }[] = [
  { id: 'solo', copy: ui.modeSolo },
  { id: 'conversation', copy: ui.modeFace },
  { id: 'camera', copy: ui.modeCamera },
]

function visibleDirection(d: SpeakDirection): 'en' | 'yue' {
  // Mandarin live STT deferred — Chinese pane live still uses Yue recognizer.
  return d === 'en' ? 'en' : 'yue'
}

/** Mode tabs + Solo live dock. Direction / auto-speak / clear live on the panes + account hub. */
export function Controls() {
  const mode = useYueStore((s) => s.mode)
  const setMode = useYueStore((s) => s.setMode)
  const speakDirection = useYueStore((s) => s.speakDirection)

  const faceMode = mode === 'conversation'
  const cameraMode = mode === 'camera'
  const showLiveDock = !faceMode && !cameraMode
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
            <LiveHoldButton side={dirValue} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
