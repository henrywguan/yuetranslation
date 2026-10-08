import { useEffect, useState } from 'react'
import { BiText } from './BiText'
import {
  enablePushNotifications,
  isPushOptIn,
  pushCapability,
  pushSupported,
} from '../lib/pushNotifications'
import { markPushNudgeShown, subscribePushNudge } from '../lib/pushNudge'
import { biPlain, ui } from '../lib/uiCopy'

/** One-time tip after a win — opt into Web Push without opening Account Hub. */
export function PushNudgeBanner() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return subscribePushNudge(() => {
      if (isPushOptIn()) {
        markPushNudgeShown()
        return
      }
      const cap = pushCapability()
      if (!cap.supported && !cap.needsIosInstall) {
        markPushNudgeShown()
        return
      }
      setOpen(true)
    })
  }, [])

  if (!open) return null

  return (
    <div className="banner warn push-nudge-banner" role="status">
      <div className="push-nudge-copy">
        <BiText copy={ui.pushNudgeBody} size="sm" />
        {error ? <span className="push-nudge-error">{error}</span> : null}
      </div>
      <div className="push-nudge-actions">
        {pushSupported() ? (
          <button
            type="button"
            className="banner-link"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              setError(null)
              void enablePushNotifications()
                .then((result) => {
                  if (!result.ok) {
                    setError(result.message)
                    return
                  }
                  markPushNudgeShown()
                  setOpen(false)
                })
                .finally(() => setBusy(false))
            }}
          >
            <BiText copy={ui.pushNudgeEnable} size="sm" layout="inline" />
          </button>
        ) : null}
        <button
          type="button"
          className="banner-link"
          aria-label={biPlain(ui.pushNudgeDismiss)}
          onClick={() => {
            markPushNudgeShown()
            setOpen(false)
          }}
        >
          <BiText copy={ui.pushNudgeDismiss} size="sm" layout="inline" />
        </button>
      </div>
    </div>
  )
}
