import { useEffect, useMemo, useState } from 'react'
import { fetchChatGithubPrChecks } from '../../../lib/api'
import type { ChatDiffEntry, ChatReviewActivity } from '../../../lib/chatReviewActivity'
import { snapshotAsPatchPreview } from '../../../lib/chatReviewActivity'
import {
  parseGithubPrUrl,
  summarizePrChecks,
  type ChatPrCheckSummary,
} from '../../../lib/chatPrChecks'

function DiffPreview({ text, path }: { text: string; path: string }) {
  const lines = text.split('\n')
  const show = lines.length > 500 ? lines.slice(0, 500) : lines
  const truncated = lines.length > 500
  return (
    <pre className="aui-diffs-preview" tabIndex={0} aria-label={`Diff for ${path}`}>
      {show.map((line, i) => {
        let cls = 'aui-diff-line'
        if (line.startsWith('+') && !line.startsWith('+++')) cls += ' is-add'
        else if (line.startsWith('-') && !line.startsWith('---')) cls += ' is-del'
        else if (line.startsWith('@@')) cls += ' is-hunk'
        else if (line.startsWith('diff ') || line.startsWith('index ')) cls += ' is-meta'
        return (
          <span key={i} className={cls}>
            {line || ' '}
            {'\n'}
          </span>
        )
      })}
      {truncated ? <span className="aui-diff-line is-meta">… ({lines.length - 500} more lines)</span> : null}
    </pre>
  )
}

function PrChecksGlance({ reviewUrl }: { reviewUrl: string }) {
  const ref = useMemo(() => parseGithubPrUrl(reviewUrl), [reviewUrl])
  const [summary, setSummary] = useState<ChatPrCheckSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!ref) {
      setSummary(null)
      setErr(null)
      setLoading(false)
      return
    }
    let cancelled = false
    // Clear prior PR summary immediately so we never flash stale checks.
    setSummary(null)
    setLoading(true)
    setErr(null)
    void fetchChatGithubPrChecks({ url: reviewUrl })
      .then((checks) => {
        if (cancelled) return
        setSummary(
          summarizePrChecks({
            state: checks.state,
            total: checks.total,
            success: checks.success,
            failure: checks.failure,
            pending: checks.pending,
            detail: checks.detail,
          }),
        )
      })
      .catch((e) => {
        if (cancelled) return
        setSummary(null)
        setErr(e instanceof Error ? e.message : 'Checks unavailable')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ref, reviewUrl])

  if (!ref) return null

  if (loading && !summary) {
    return (
      <span className="aui-pr-checks is-pending" title="Loading PR checks">
        Checks · …
      </span>
    )
  }
  if (err && !summary) {
    return (
      <span className="aui-pr-checks is-unknown" title={err}>
        Checks · —
      </span>
    )
  }
  if (!summary) return null
  return (
    <span
      className={`aui-pr-checks is-${summary.state}`}
      title={summary.detail || summary.label}
      aria-label={summary.detail || summary.label}
    >
      {summary.label}
    </span>
  )
}

export function ChatDiffsPanel({
  activity,
  reviewUrl,
  sandboxSessionId,
  refreshing,
  onRefreshGit,
  onClose,
}: {
  activity: ChatReviewActivity
  reviewUrl?: string
  sandboxSessionId?: string
  refreshing?: boolean
  onRefreshGit?: () => void
  onClose?: () => void
}) {
  const diffs = activity.diffs
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const selected = useMemo(() => {
    if (!diffs.length) return null
    const hit = selectedPath ? diffs.find((d) => d.path === selectedPath) : null
    return hit || diffs[0]!
  }, [diffs, selectedPath])

  const effectiveReview = reviewUrl || activity.reviewUrl

  const previewText = useMemo(() => {
    if (!selected) return ''
    const raw = selected.text?.trim() || ''
    const looksUnified = /^diff --git /m.test(raw) || /^\+\+\+ /m.test(raw)
    if (selected.source === 'sandbox' || selected.source === 'workspace') {
      // Sandbox/workspace SSE stores file snapshots — render as +lined preview
      // unless we already have a real unified diff (e.g. after git refresh).
      if (looksUnified) return raw
      return snapshotAsPatchPreview(selected.path, selected.text)
    }
    return raw
  }, [selected])

  return (
    <section className="aui-review-panel aui-diffs-panel" aria-label="Diffs">
      <header className="aui-review-head">
        <div className="aui-review-title">
          <span>Diffs</span>
          <span className="aui-review-count" aria-hidden>
            {diffs.length}
          </span>
        </div>
        <div className="aui-review-actions">
          {sandboxSessionId && onRefreshGit ? (
            <button
              type="button"
              className="aui-review-btn"
              disabled={refreshing}
              onClick={onRefreshGit}
            >
              {refreshing ? 'Refreshing…' : 'git diff'}
            </button>
          ) : null}
          {effectiveReview ? (
            <>
              <PrChecksGlance reviewUrl={effectiveReview} />
              <a
                className="aui-review-btn aui-review-btn--pr"
                href={effectiveReview}
                target="_blank"
                rel="noreferrer"
              >
                Open PR
              </a>
            </>
          ) : null}
          {onClose ? (
            <button type="button" className="aui-review-btn aui-review-btn--quiet" onClick={onClose}>
              ×
            </button>
          ) : null}
        </div>
      </header>

      {!diffs.length ? (
        <p className="aui-review-empty">
          Sandbox and workspace writes appear here with patch text when available. Use{' '}
          <strong>git diff</strong> on a linked Internal sandbox, or open a PR when GitHub is bound.
        </p>
      ) : (
        <div className="aui-diffs-body">
          <ul className="aui-diffs-list">
            {diffs.map((d: ChatDiffEntry) => (
              <li key={d.id}>
                <button
                  type="button"
                  className={`aui-diffs-file${selected?.path === d.path ? ' is-on' : ''}${d.text?.trim() ? ' has-text' : ''}`}
                  onClick={() => setSelectedPath(d.path)}
                >
                  <span className="aui-diffs-source" data-source={d.source}>
                    {d.source === 'git' ? 'git' : d.source === 'workspace' ? 'ws' : 'sbx'}
                  </span>
                  <span className="aui-diffs-path">{d.path}</span>
                </button>
              </li>
            ))}
          </ul>
          {selected ? (
            previewText ? (
              <DiffPreview text={previewText} path={selected.path} />
            ) : (
              <p className="aui-review-empty aui-diffs-missing">
                No patch text for <code>{selected.path}</code> yet — re-run the write or refresh{' '}
                <strong>git diff</strong>.
              </p>
            )
          ) : null}
        </div>
      )}
    </section>
  )
}
