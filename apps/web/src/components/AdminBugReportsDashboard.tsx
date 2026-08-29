import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AdminBugReport } from '../lib/adminApi'
import {
  diagnoseBugReport,
  formatReportAge,
  shortReportId,
  type DiagnosisSeverity,
  type ReportDiagnosis,
} from '../lib/bugReportDiagnosis'
import { inkEase } from '../lib/motion'
import './AdminBugReportsDashboard.css'

type ReportStatus = AdminBugReport['status']

type Props = {
  reports: AdminBugReport[]
  busy: boolean
  selectedId: string | null
  onSelect: (report: AdminBugReport | null) => void
  onStatusChange: (report: AdminBugReport, status: ReportStatus) => void
  onBulkStatusChange: (reports: AdminBugReport[], status: ReportStatus) => void
}

type StatusFilter = 'all' | ReportStatus
type TypeFilter = 'all' | string

const LONG_PRESS_MS = 480
const MOVE_CANCEL_PX = 12

function severityClass(s: DiagnosisSeverity): string {
  return `brd-sev brd-sev--${s}`
}

function IssueGlyph({ type }: { type: string }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 14,
    height: 14,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  switch (type) {
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
        </svg>
      )
    case 'camera':
      return (
        <svg {...common}>
          <path d="M4 8h3l2-2h6l2 2h3v11H4V8z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      )
    case 'crash':
      return (
        <svg {...common}>
          <path d="M12 3v5" />
          <path d="M10 14h4l1 6H9l1-6z" />
        </svg>
      )
    case 'account':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      )
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

function DiagnosisPanel({
  report,
  diagnosis,
  busy,
  onStatusChange,
  onClose,
  panelRef,
}: {
  report: AdminBugReport
  diagnosis: ReportDiagnosis
  busy: boolean
  onStatusChange: (report: AdminBugReport, status: ReportStatus) => void
  onClose: () => void
  panelRef: RefObject<HTMLElement | null>
}) {
  const [showRaw, setShowRaw] = useState(false)
  const confidencePct = Math.round(diagnosis.confidence * 100)

  return (
    <motion.aside
      ref={panelRef as RefObject<HTMLElement>}
      className="brd-detail"
      aria-label="Bug report diagnosis"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.28, ease: inkEase }}
    >
      <header className="brd-detail-head">
        <div className="brd-detail-kicker">
          <span className={severityClass(diagnosis.severity)}>{diagnosis.severity}</span>
          <span className="brd-id">{shortReportId(report.id)}</span>
          <span className="brd-muted">{formatReportAge(report.created_at)}</span>
        </div>
        <button type="button" className="brd-close" onClick={onClose} aria-label="Close diagnosis">
          ×
        </button>
      </header>

      <motion.h2
        className="brd-detail-title"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.28, ease: inkEase }}
      >
        {diagnosis.title}
      </motion.h2>
      <p className="brd-detail-summary">{diagnosis.summary}</p>

      <div className="brd-confidence" aria-label={`Diagnosis confidence ${confidencePct}%`}>
        <div className="brd-confidence-meta">
          <span>Self-diagnosis confidence</span>
          <strong>{confidencePct}%</strong>
        </div>
        <div className="brd-confidence-track">
          <motion.div
            className="brd-confidence-fill"
            initial={{ width: 0 }}
            animate={{ width: `${confidencePct}%` }}
            transition={{ duration: 0.55, ease: inkEase, delay: 0.12 }}
          />
        </div>
      </div>

      <div className="brd-status-row">
        <label>
          Status
          <select
            value={report.status}
            disabled={busy}
            onChange={(e) =>
              onStatusChange(report, e.target.value as ReportStatus)
            }
          >
            <option value="open">open</option>
            <option value="triaged">triaged</option>
            <option value="closed">closed</option>
          </select>
        </label>
        <div className="brd-user-chip">
          <span className="brd-muted">From</span>
          <strong>{report.email || report.user_id.slice(0, 8)}</strong>
        </div>
      </div>

      <section className="brd-section">
        <h3>Findings</h3>
        <ul className="brd-findings">
          {diagnosis.findings.map((f, i) => (
            <motion.li
              key={f.id}
              className={`brd-finding brd-finding--${f.tone}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.04, duration: 0.24, ease: inkEase }}
            >
              <span className="brd-finding-label">{f.label}</span>
              <span className="brd-finding-detail">{f.detail}</span>
            </motion.li>
          ))}
        </ul>
      </section>

      <section className="brd-section">
        <h3>Suggested next steps</h3>
        <ol className="brd-actions">
          {diagnosis.actions.map((a, i) => (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 + i * 0.05, duration: 0.24, ease: inkEase }}
            >
              <strong>{a.title}</strong>
              <span>{a.detail}</span>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="brd-section">
        <h3>Signals</h3>
        <div className="brd-signals">
          {diagnosis.signals.map((s) => (
            <div key={s.label} className="brd-signal">
              <span>{s.label}</span>
              <strong title={s.value}>{s.value}</strong>
            </div>
          ))}
        </div>
      </section>

      {diagnosis.timeline.length ? (
        <section className="brd-section">
          <h3>Recent trail</h3>
          <ol className="brd-timeline">
            {diagnosis.timeline.map((ev) => (
              <li key={`${ev.t}-${ev.kind}-${ev.detail || ''}`}>
                <time dateTime={new Date(ev.t).toISOString()}>
                  {new Date(ev.t).toLocaleTimeString()}
                </time>
                <div>
                  <strong>{ev.label}</strong>
                  {ev.detail ? <span>{ev.detail}</span> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {diagnosis.screenshot ? (
        <section className="brd-section">
          <h3>Screenshot</h3>
          <a
            className="brd-shot"
            href={diagnosis.screenshot}
            target="_blank"
            rel="noreferrer"
            title="Open full screenshot"
          >
            <img src={diagnosis.screenshot} alt="User-attached diagnostic screenshot" />
          </a>
          <p className="brd-shot-hint">Tap image to open full size</p>
        </section>
      ) : null}

      <section className="brd-section">
        <button
          type="button"
          className="brd-raw-toggle"
          aria-expanded={showRaw}
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? 'Hide technical payload' : 'Show technical payload'}
        </button>
        {showRaw ? (
          <pre className="brd-raw">
            {JSON.stringify({ client: report.client, context: report.context }, null, 2)}
          </pre>
        ) : null}
      </section>
    </motion.aside>
  )
}

export function AdminBugReportsDashboard({
  reports,
  busy,
  selectedId,
  onSelect,
  onStatusChange,
  onBulkStatusChange,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [q, setQ] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const detailRef = useRef<HTMLElement | null>(null)
  const longPressRef = useRef<{
    id: string
    timer: number
    x: number
    y: number
    armed: boolean
  } | null>(null)
  const skipClickRef = useRef(false)

  const types = useMemo(() => {
    const set = new Set(reports.map((r) => r.issue_type))
    return Array.from(set).sort()
  }, [reports])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (typeFilter !== 'all' && r.issue_type !== typeFilter) return false
      if (!needle) return true
      const hay = `${r.email || ''} ${r.user_id} ${r.issue_type} ${r.route || ''} ${r.mode || ''}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [reports, statusFilter, typeFilter, q])

  const selected = filtered.find((r) => r.id === selectedId) || reports.find((r) => r.id === selectedId) || null
  const diagnosis = selected ? diagnoseBugReport(selected) : null

  const counts = useMemo(() => {
    const open = reports.filter((r) => r.status === 'open').length
    const triaged = reports.filter((r) => r.status === 'triaged').length
    const closed = reports.filter((r) => r.status === 'closed').length
    return { open, triaged, closed, total: reports.length }
  }, [reports])

  const selectedReports = useMemo(
    () => filtered.filter((r) => selectedIds.has(r.id)),
    [filtered, selectedIds],
  )

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  const enterSelectMode = useCallback(
    (seedId: string) => {
      setSelectMode(true)
      setSelectedIds(new Set([seedId]))
      onSelect(null)
    },
    [onSelect],
  )

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Scroll page to the start of the open report detail.
  useEffect(() => {
    if (!selectedId || selectMode) return
    const t = window.setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => window.clearTimeout(t)
  }, [selectedId, selectMode])

  useEffect(() => {
    if (!selectMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitSelectMode()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectMode, exitSelectMode])

  const clearLongPress = useCallback(() => {
    const lp = longPressRef.current
    if (lp?.timer) window.clearTimeout(lp.timer)
    longPressRef.current = null
  }, [])

  const onCardPointerDown = (reportId: string, e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (selectMode) return
    clearLongPress()
    const x = e.clientX
    const y = e.clientY
    longPressRef.current = {
      id: reportId,
      x,
      y,
      armed: true,
      timer: window.setTimeout(() => {
        const cur = longPressRef.current
        if (!cur || cur.id !== reportId || !cur.armed) return
        skipClickRef.current = true
        enterSelectMode(reportId)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(12)
          } catch {
            /* ignore */
          }
        }
        clearLongPress()
      }, LONG_PRESS_MS),
    }
  }

  const onCardPointerMove = (e: React.PointerEvent) => {
    const lp = longPressRef.current
    if (!lp?.armed) return
    const dx = Math.abs(e.clientX - lp.x)
    const dy = Math.abs(e.clientY - lp.y)
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearLongPress()
  }

  const onCardClick = (r: AdminBugReport) => {
    if (skipClickRef.current) {
      skipClickRef.current = false
      return
    }
    if (selectMode) {
      toggleSelected(r.id)
      return
    }
    onSelect(r.id === selectedId ? null : r)
  }

  const applyBulkStatus = (status: ReportStatus) => {
    if (!selectedReports.length) return
    onBulkStatusChange(selectedReports, status)
    exitSelectMode()
  }

  const selectAllFiltered = () => {
    setSelectMode(true)
    setSelectedIds(new Set(filtered.map((r) => r.id)))
    onSelect(null)
  }

  return (
    <div className={`brd${selectMode ? ' is-selecting' : ''}`}>
      <header className="brd-hero">
        <div>
          <p className="brd-hero-kicker">Self-diagnostic inbox</p>
          <h2 className="brd-hero-title">Bug reports</h2>
          <p className="brd-hero-sub">
            Compact queue with automatic interpretation — findings, confidence, and next steps instead of raw JSON.
            On mobile, long-press a report to multi-select and change status in bulk.
          </p>
        </div>
        <div className="brd-stats" aria-label="Report counts">
          <div className="brd-stat">
            <strong>{counts.open}</strong>
            <span>Open</span>
          </div>
          <div className="brd-stat">
            <strong>{counts.triaged}</strong>
            <span>Triaged</span>
          </div>
          <div className="brd-stat">
            <strong>{counts.closed}</strong>
            <span>Closed</span>
          </div>
        </div>
      </header>

      <div className="brd-toolbar">
        <label className="brd-search">
          <span className="brd-sr">Search</span>
          <input
            type="search"
            placeholder="Search email, type, route…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="triaged">Triaged</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label>
          Type
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="admin-btn admin-btn--secondary brd-select-btn"
          onClick={() => (selectMode ? exitSelectMode() : selectAllFiltered())}
        >
          {selectMode ? 'Cancel select' : 'Select'}
        </button>
        <p className="brd-muted brd-count">
          {busy ? 'Loading…' : `${filtered.length} shown`}
        </p>
      </div>

      {selectMode ? (
        <div className="brd-bulk-bar" role="toolbar" aria-label="Bulk status">
          <p className="brd-bulk-count">
            <strong>{selectedIds.size}</strong> selected
          </p>
          <div className="brd-bulk-actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={busy || !selectedIds.size}
              onClick={() => applyBulkStatus('open')}
            >
              Open
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={busy || !selectedIds.size}
              onClick={() => applyBulkStatus('triaged')}
            >
              Triaged
            </button>
            <button
              type="button"
              className="admin-btn"
              disabled={busy || !selectedIds.size}
              onClick={() => applyBulkStatus('closed')}
            >
              Close
            </button>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={exitSelectMode}>
              Done
            </button>
          </div>
        </div>
      ) : null}

      <div className={`brd-layout${selected && !selectMode ? ' has-detail' : ''}`}>
        <div className="brd-list" role="list">
          <AnimatePresence initial={false}>
            {filtered.map((r, i) => {
              const d = diagnoseBugReport(r)
              const active = !selectMode && r.id === selectedId
              const checked = selectMode && selectedIds.has(r.id)
              return (
                <motion.button
                  key={r.id}
                  type="button"
                  role="listitem"
                  className={`brd-card${active ? ' is-active' : ''}${checked ? ' is-checked' : ''}${selectMode ? ' is-select-mode' : ''}`}
                  onClick={() => onCardClick(r)}
                  onPointerDown={(e) => onCardPointerDown(r.id, e)}
                  onPointerMove={onCardPointerMove}
                  onPointerUp={clearLongPress}
                  onPointerCancel={clearLongPress}
                  onContextMenu={(e) => {
                    // Suppress the iOS callout / context menu after a long-press select.
                    if (selectMode || skipClickRef.current) e.preventDefault()
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: inkEase, delay: Math.min(i, 8) * 0.02 }}
                  layout
                >
                  <div className="brd-card-top">
                    <span className="brd-type">
                      {selectMode ? (
                        <span className={`brd-check${checked ? ' is-on' : ''}`} aria-hidden>
                          {checked ? '✓' : ''}
                        </span>
                      ) : (
                        <IssueGlyph type={r.issue_type} />
                      )}
                      {d.categoryLabel}
                    </span>
                    <span className={`brd-status brd-status--${r.status}`}>{r.status}</span>
                  </div>
                  <p className="brd-card-title">{d.title}</p>
                  <p className="brd-card-meta">
                    <span>{r.email || r.user_id.slice(0, 8)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatReportAge(r.created_at)}</span>
                    <span aria-hidden="true">·</span>
                    <span className={severityClass(d.severity)}>{d.severity}</span>
                  </p>
                  {d.lastError ? <p className="brd-card-error">{d.lastError}</p> : null}
                </motion.button>
              )
            })}
          </AnimatePresence>

          {!filtered.length && !busy ? (
            <p className="brd-empty">No reports match these filters.</p>
          ) : null}
        </div>

        <AnimatePresence mode="wait">
          {selected && diagnosis && !selectMode ? (
            <DiagnosisPanel
              key={selected.id}
              report={selected}
              diagnosis={diagnosis}
              busy={busy}
              onStatusChange={onStatusChange}
              onClose={() => onSelect(null)}
              panelRef={detailRef}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
