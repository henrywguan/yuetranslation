import { motion } from 'framer-motion'
import { useYueStore } from '../lib/store'
import type { Mode, SpeakDirection } from '../lib/types'

const MODES: { id: Mode; label: string }[] = [
  { id: 'solo', label: 'Solo' },
  { id: 'conversation', label: 'Face to face' },
  { id: 'text', label: 'Text' },
]

const DIRS: { id: SpeakDirection; label: string }[] = [
  { id: 'auto', label: 'Auto' },
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

  return (
    <div className="controls">
      <div className="mode-tabs" role="tablist" aria-label="Mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={mode === m.id ? 'active' : ''}
            onClick={() => setMode(m.id)}
          >
            {m.label}
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
          >
            <span className="live-dot" />
            {live ? (status === 'speaking' ? 'Speaking…' : 'Listening — tap to stop') : 'Start listening'}
          </motion.button>
        </div>
      ) : null}

      <div className="opt-row">
        {mode !== 'text' ? (
          <label className="opt">
            Direction
            <select
              value={speakDirection}
              onChange={(e) => setSpeakDirection(e.target.value as SpeakDirection)}
            >
              {DIRS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className={`opt toggle ${!canAutoSpeak ? 'disabled' : ''}`}>
          <input
            type="checkbox"
            checked={autoSpeak && canAutoSpeak}
            disabled={!canAutoSpeak}
            onChange={(e) => setAutoSpeak(e.target.checked)}
          />
          Auto-speak{!canAutoSpeak ? ' (Pro)' : ''}
        </label>
        <button type="button" className="text-btn" onClick={clearHistory}>
          Clear
        </button>
      </div>
    </div>
  )
}
