import { useEffect, useState, useSyncExternalStore } from 'react'
import { BiText } from './BiText'
import {
  BUG_ISSUE_OPTIONS,
  closeBugReportScreen,
  isBugReportScreenOpen,
  submitBugReport,
  subscribeBugReportScreen,
  type BugIssueType,
} from '../lib/bugReport'
import { getSession } from '../lib/auth'
import { captureAppScreenshot } from '../lib/captureScreenshot'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import './BugReportModal.css'

function IssueIcon({ type }: { type: BugIssueType }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 15,
    height: 15,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }

  switch (type) {
    case 'translation':
      return (
        <svg {...common}>
          <path d="M5 8h8" />
          <path d="M9 4v4" />
          <path d="m13 16 4-10 4 10" />
          <path d="M14.5 13h5" />
          <path d="M5 12h4a3 3 0 0 1 3 3v3" />
        </svg>
      )
    case 'mic':
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
        </svg>
      )
    case 'tts':
      return (
        <svg {...common}>
          <path d="M11 5 6 9H3v6h3l5 4V5z" />
          <path d="M15.5 8.5a4 4 0 0 1 0 7" />
          <path d="M18 6a7 7 0 0 1 0 12" />
        </svg>
      )
    case 'camera':
      return (
        <svg {...common}>
          <path d="M4 8h3l2-2h6l2 2h3v11H4V8z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      )
    case 'account':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      )
    case 'ui':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 9h16" />
          <path d="M9 9v11" />
        </svg>
      )
    case 'crash':
      return (
        <svg {...common}>
          <path d="M12 3v5" />
          <path d="m8 7 2.5 2.5" />
          <path d="m16 7-2.5 2.5" />
          <path d="M10 14h4l1 6H9l1-6z" />
          <path d="M9 12h6" />
        </svg>
      )
    case 'other':
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
      )
  }
}

export function BugReportModal() {
  const open = useSyncExternalStore(subscribeBugReportScreen, isBugReportScreenOpen, () => false)
  const mode = useYueStore((s) => s.mode)
  const demoMode = useYueStore((s) => s.demoMode)
  const live = useYueStore((s) => s.live)
  const translating = useYueStore((s) => s.translating)
  const entitlement = useYueStore((s) => s.entitlement)

  const [issueType, setIssueType] = useState<BugIssueType | null>(null)
  const [note, setNote] = useState('')
  const [allowScreenshot, setAllowScreenshot] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!open) {
      setIssueType(null)
      setNote('')
      setAllowScreenshot(false)
      setBusy(false)
      setMessage(null)
      setSent(false)
    }
  }, [open])

  if (!open) return null

  const close = () => {
    closeBugReportScreen()
    setMessage(null)
  }

  const onSubmit = async () => {
    if (!issueType) {
      setMessage(biPlain(ui.bugReportPickType))
      return
    }
    const session = await getSession()
    if (!session) {
      setMessage(biPlain(ui.bugReportSignInRequired))
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      let screenshot: string | null = null
      if (allowScreenshot) {
        screenshot = await captureAppScreenshot()
      }
      await submitBugReport(
        issueType,
        {
          mode,
          demoMode,
          live,
          translating,
          entitlement,
        },
        {
          note: note.trim() || undefined,
          allowScreenshot,
          screenshot: screenshot || undefined,
        },
      )
      setSent(true)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to send report')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bug-report-overlay" role="dialog" aria-modal="true" aria-labelledby="bug-report-title">
      <button type="button" className="bug-report-backdrop" aria-label="Close" onClick={close} />
      <div className="bug-report-panel">
        <button type="button" className="bug-report-close" onClick={close} aria-label="Close">
          ×
        </button>

        {sent ? (
          <div className="bug-report-success">
            <h2 id="bug-report-title" className="bug-report-title">
              <BiText copy={ui.bugReportThanks} size="md" />
            </h2>
            <p className="bug-report-hint">
              <BiText copy={ui.bugReportThanksHint} size="sm" />
            </p>
            <button type="button" className="bug-report-submit" onClick={close}>
              <BiText copy={ui.bugReportDone} size="sm" />
            </button>
          </div>
        ) : (
          <>
            <h2 id="bug-report-title" className="bug-report-title">
              <BiText copy={ui.bugReportTitle} size="md" />
            </h2>
            <p className="bug-report-hint">
              <BiText copy={ui.bugReportHint} size="sm" />
            </p>

            <div className="bug-report-grid" role="radiogroup" aria-label={biPlain(ui.bugReportTitle)}>
              {BUG_ISSUE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={issueType === opt.id}
                  className={`bug-report-opt${issueType === opt.id ? ' is-on' : ''}`}
                  disabled={busy}
                  onClick={() => setIssueType(opt.id)}
                >
                  <span className="bug-report-opt-icon">
                    <IssueIcon type={opt.id} />
                  </span>
                  <span className="bug-report-opt-copy">
                    <span className="bug-report-opt-en">{opt.labelEn}</span>
                    <span className="bug-report-opt-zh">{opt.labelZh}</span>
                  </span>
                </button>
              ))}
            </div>

            <label className="bug-report-note">
              <textarea
                className="bug-report-textarea"
                rows={2}
                maxLength={2000}
                placeholder={biPlain(ui.bugReportNotePlaceholder)}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
              />
            </label>

            <label className="bug-report-check">
              <input
                type="checkbox"
                checked={allowScreenshot}
                disabled={busy}
                onChange={(e) => setAllowScreenshot(e.target.checked)}
              />
              <BiText copy={ui.bugReportAllowScreenshot} size="sm" />
            </label>

            {message ? <p className="bug-report-message">{message}</p> : null}

            <button
              type="button"
              className="bug-report-submit"
              disabled={busy || !issueType}
              onClick={() => void onSubmit()}
            >
              <BiText copy={busy ? ui.bugReportSending : ui.bugReportSend} size="sm" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
