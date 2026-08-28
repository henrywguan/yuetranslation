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
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import './BugReportModal.css'

export function BugReportModal() {
  const open = useSyncExternalStore(subscribeBugReportScreen, isBugReportScreenOpen, () => false)
  const mode = useYueStore((s) => s.mode)
  const demoMode = useYueStore((s) => s.demoMode)
  const live = useYueStore((s) => s.live)
  const translating = useYueStore((s) => s.translating)
  const entitlement = useYueStore((s) => s.entitlement)

  const [issueType, setIssueType] = useState<BugIssueType | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!open) {
      setIssueType(null)
      setNoteOpen(false)
      setNote('')
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
      await submitBugReport(issueType, {
        mode,
        demoMode,
        live,
        translating,
        entitlement,
      }, note.trim() || undefined)
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
                  <span className="bug-report-opt-en">{opt.labelEn}</span>
                  <span className="bug-report-opt-zh">{opt.labelZh}</span>
                </button>
              ))}
            </div>

            <div className="bug-report-note">
              <button
                type="button"
                className="bug-report-note-toggle"
                aria-expanded={noteOpen}
                onClick={() => setNoteOpen((v) => !v)}
              >
                <BiText copy={ui.bugReportAddNote} size="sm" />
              </button>
              {noteOpen ? (
                <textarea
                  className="bug-report-textarea"
                  rows={3}
                  maxLength={2000}
                  placeholder={biPlain(ui.bugReportNotePlaceholder)}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={busy}
                />
              ) : null}
            </div>

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
