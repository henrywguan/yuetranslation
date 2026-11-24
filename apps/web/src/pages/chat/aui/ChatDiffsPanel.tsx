import { memo, useEffect, useMemo, useState } from 'react'
import { fetchChatGithubPrChecks } from '../../../lib/api'
import type { ChatDiffEntry, ChatReviewActivity } from '../../../lib/chatReviewActivity'
import {
  CHAT_DIFF_HIGHLIGHT_MAX_LINES,
  plainDiffPreviewText,
  shouldUsePlainDiffPreview,
  snapshotAsPatchPreview,
  truncateDiffLine,
} from '../../../lib/chatReviewActivity'
import {
  parseGithubPrUrl,
  summarizePrChecks,
  type ChatPrCheckSummary,
} from '../../../lib/chatPrChecks'

/**
 * Highlighted per-line paint — only for idle + small patches.
 * While Agent is Working (or for 28KB+ HTML), we keep a live plain `<pre>` so
 * Diffs never rebuild hundreds of spans on every SSE tick.
 */
const HighlightedDiffPreview = memo(function HighlightedDiffPreview({
  text,
  path,
}: {
  text: string
  path: string
}) {
  const lines = text.split('\n')
  const show =
    lines.length > CHAT_DIFF_HIGHLIGHT_MAX_LINES
      ? lines.slice(0, CHAT_DIFF_HIGHLIGHT_MAX_LINES)
      : lines
  const truncated = lines.length > CHAT_DIFF_HIGHLIGHT_MAX_LINES
  return (
    <pre className="aui-diffs-preview" tabIndex={0} aria-label={`Diff for ${path}`}>
      {show.map((line, i) => {
        const clipped = truncateDiffLine(line)
        let cls = 'aui-diff-line'
        if (clipped.startsWith('+') && !clipped.startsWith('+++')) cls += ' is-add'
        else if (clipped.startsWith('-') && !clipped.startsWith('---')) cls += ' is-del'
        else if (clipped.startsWith('@@')) cls += ' is-hunk'
        else if (clipped.startsWith('diff ') || clipped.startsWith('index ')) cls += ' is-meta'
        return (
          <span key={i} className={cls}>
            {clipped || ' '}
            {'\n'}
          </span>
        )
      })}
      {truncated ? (
        <span className="aui-diff-line is-meta">
          … ({lines.length - CHAT_DIFF_HIGHLIGHT_MAX_LINES} more lines)
        </span>
      ) : null}
    </pre>
  )
})

function DiffPreview({
  text,
  path,
  busy,
}: {
  text: string
  path: string
  busy?: boolean
}) {
  const usePlain = shouldUsePlainDiffPreview({ text, busy })
  // Defer highlight until idle so opening Diffs mid-run never locks the tab.
  const [allowHighlight, setAllowHighlight] = useState(!usePlain)

  useEffect(() => {
    if (usePlain) {
      setAllowHighlight(false)
      return
    }
    let cancelled = false
    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const enable = () => {
      if (!cancelled) setAllowHighlight(true)
    }
    if (typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(enable, { timeout: 400 })
    } else {
      timeoutId = setTimeout(enable, 0)
    }
    return () => {
      cancelled = true
      if (idleId !== undefined && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleId)
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [usePlain, text, path])

  if (usePlain || !allowHighlight) {
    const shown = plainDiffPreviewText(text)
    return (
      <pre
        className="aui-diffs-preview is-plain-live"
        tabIndex={0}
        aria-busy={busy || undefined}
        aria-label={`Diff for ${path}${busy ? ' (live)' : ''}`}
      >
        {shown}
      </pre>
    )
  }

  return <HighlightedDiffPreview text={text} path={path} />
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
  busy,
  onRefreshGit,
  onClose,
}: {
  activity: ChatReviewActivity
  reviewUrl?: string
  sandboxSessionId?: string
  refreshing?: boolean
  /** Agent turn still running — keep Diffs live but plain. */
  busy?: boolean
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
              <DiffPreview text={previewText} path={selected.path} busy={busy} />
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
