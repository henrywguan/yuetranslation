import { useEffect, useState } from 'react'
import { formatLiveSeconds, type AdminUser } from '../lib/adminApi'

type MetricKey = 'live' | 'tts' | 'cam'

type MetricState = {
  enabled: boolean
  hours: string
  minutes: string
  seconds: string
  chars: string
}

type Props = {
  open: boolean
  user: AdminUser | null
  monthLabel: string
  busy: boolean
  onClose: () => void
  onSubmit: (patch: {
    liveSeconds?: number
    ttsChars?: number
    cameraSeconds?: number
    docsPages?: number
  }) => void
}

function emptyMetric(): MetricState {
  return { enabled: false, hours: '0', minutes: '0', seconds: '0', chars: '0' }
}

function secondsFromParts(hours: string, minutes: string, seconds: string): number {
  const h = Math.max(0, parseInt(hours, 10) || 0)
  const m = Math.max(0, parseInt(minutes, 10) || 0)
  const s = Math.max(0, parseInt(seconds, 10) || 0)
  return h * 3600 + m * 60 + s
}

function partsFromSeconds(total: number) {
  const s = Math.max(0, Math.floor(total))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return {
    hours: String(h),
    minutes: String(m),
    seconds: String(sec),
  }
}

function metricFromUser(user: AdminUser, key: MetricKey): MetricState {
  if (key === 'live') {
    const parts = partsFromSeconds(user.liveSeconds)
    return { enabled: false, ...parts, chars: '0' }
  }
  if (key === 'cam') {
    const parts = partsFromSeconds(user.cameraSeconds)
    return { enabled: false, ...parts, chars: '0' }
  }
  return {
    enabled: false,
    hours: '0',
    minutes: '0',
    seconds: '0',
    chars: String(user.ttsChars),
  }
}

export function AdminResetUsageModal({ open, user, monthLabel, busy, onClose, onSubmit }: Props) {
  const [live, setLive] = useState<MetricState>(emptyMetric)
  const [tts, setTts] = useState<MetricState>(emptyMetric)
  const [cam, setCam] = useState<MetricState>(emptyMetric)
  const [docsEnabled, setDocsEnabled] = useState(false)
  const [docsPages, setDocsPages] = useState('0')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !user) return
    setLive(metricFromUser(user, 'live'))
    setTts(metricFromUser(user, 'tts'))
    setCam(metricFromUser(user, 'cam'))
    setDocsEnabled(false)
    setDocsPages(String(user.docsPages ?? 0))
    setError('')
  }, [open, user])

  if (!open || !user) return null

  const resetMetric = (key: MetricKey) => {
    if (key === 'live') {
      setLive((m) => ({ ...m, enabled: true, hours: '0', minutes: '0', seconds: '0' }))
    } else if (key === 'cam') {
      setCam((m) => ({ ...m, enabled: true, hours: '0', minutes: '0', seconds: '0' }))
    } else {
      setTts((m) => ({ ...m, enabled: true, chars: '0' }))
    }
  }

  const submit = () => {
    const patch: {
      liveSeconds?: number
      ttsChars?: number
      cameraSeconds?: number
      docsPages?: number
    } = {}
    if (live.enabled) patch.liveSeconds = secondsFromParts(live.hours, live.minutes, live.seconds)
    if (tts.enabled) patch.ttsChars = Math.max(0, parseInt(tts.chars, 10) || 0)
    if (cam.enabled) patch.cameraSeconds = secondsFromParts(cam.hours, cam.minutes, cam.seconds)
    if (docsEnabled) patch.docsPages = Math.max(0, parseInt(docsPages, 10) || 0)

    if (!live.enabled && !tts.enabled && !cam.enabled && !docsEnabled) {
      setError('Select at least one usage type to update.')
      return
    }
    setError('')
    onSubmit(patch)
  }

  const renderTimeMetric = (
    key: MetricKey,
    label: string,
    currentSeconds: number,
    state: MetricState,
    setState: (next: MetricState | ((prev: MetricState) => MetricState)) => void,
  ) => (
    <fieldset className="admin-reset-field" key={key}>
      <label className="admin-reset-check">
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={(e) => setState((m) => ({ ...m, enabled: e.target.checked }))}
        />
        <span>
          <strong>{label}</strong>
          <span className="admin-sub">Current: {formatLiveSeconds(currentSeconds)}</span>
        </span>
      </label>
      {state.enabled ? (
        <div className="admin-reset-inputs">
          <label>
            Hours
            <input
              type="number"
              min={0}
              value={state.hours}
              onChange={(e) => setState((m) => ({ ...m, hours: e.target.value }))}
            />
          </label>
          <label>
            Minutes
            <input
              type="number"
              min={0}
              max={59}
              value={state.minutes}
              onChange={(e) => setState((m) => ({ ...m, minutes: e.target.value }))}
            />
          </label>
          <label>
            Seconds
            <input
              type="number"
              min={0}
              max={59}
              value={state.seconds}
              onChange={(e) => setState((m) => ({ ...m, seconds: e.target.value }))}
            />
          </label>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => resetMetric(key)}>
            Reset to 0
          </button>
        </div>
      ) : null}
    </fieldset>
  )

  return (
    <div className="admin-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-reset-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-modal-header">
          <div>
            <h2 id="admin-reset-title">Adjust usage</h2>
            <p className="admin-muted">
              {user.username
                ? `@${user.username}${user.email ? ` · ${user.email}` : ''}`
                : user.email || user.displayName || user.id}{' '}
              · {monthLabel}
            </p>
          </div>
          <button type="button" className="admin-link-btn" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>

        <p className="admin-muted admin-reset-hint">
          Choose which meters to update. Set a custom value or reset to zero.
        </p>

        {renderTimeMetric('live', 'Live mic', user.liveSeconds, live, setLive)}

        <fieldset className="admin-reset-field">
          <label className="admin-reset-check">
            <input
              type="checkbox"
              checked={tts.enabled}
              onChange={(e) => setTts((m) => ({ ...m, enabled: e.target.checked }))}
            />
            <span>
              <strong>TTS</strong>
              <span className="admin-sub">Current: {user.ttsChars.toLocaleString()} chars</span>
            </span>
          </label>
          {tts.enabled ? (
            <div className="admin-reset-inputs">
              <label className="admin-reset-grow">
                Characters
                <input
                  type="number"
                  min={0}
                  value={tts.chars}
                  onChange={(e) => setTts((m) => ({ ...m, chars: e.target.value }))}
                />
              </label>
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => resetMetric('tts')}>
                Reset to 0
              </button>
            </div>
          ) : null}
        </fieldset>

        {renderTimeMetric('cam', 'Cam', user.cameraSeconds, cam, setCam)}

        <fieldset className="admin-reset-field">
          <label className="admin-reset-check">
            <input
              type="checkbox"
              checked={docsEnabled}
              onChange={(e) => setDocsEnabled(e.target.checked)}
            />
            <span>
              <strong>Docs pages</strong>
              <span className="admin-sub">
                Current: {(user.docsPages ?? 0).toLocaleString()} pages
              </span>
            </span>
          </label>
          {docsEnabled ? (
            <div className="admin-reset-inputs">
              <label className="admin-reset-grow">
                Pages
                <input
                  type="number"
                  min={0}
                  value={docsPages}
                  onChange={(e) => setDocsPages(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => {
                  setDocsEnabled(true)
                  setDocsPages('0')
                }}
              >
                Reset to 0
              </button>
            </div>
          ) : null}
        </fieldset>

        {error ? <p className="admin-error admin-reset-error">{error}</p> : null}

        <footer className="admin-modal-footer">
          <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="admin-btn" disabled={busy} onClick={submit}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </footer>
      </div>
    </div>
  )
}
