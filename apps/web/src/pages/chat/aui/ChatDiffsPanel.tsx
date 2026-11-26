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
  countDiffDecisions,
  decisionLabel,
  diffDecisionFor,
  looksLikeUnifiedDiff,
  sanitizeCommitMessage,
  splitPatchHunks,
  type ChatDiffDecision,
} from '../../../lib/chatDiffReview'
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

function DecisionBadge({ decision }: { decision: ChatDiffDecision }) {
  const label = decisionLabel(decision)
  if (!label) return null
  return (
    <span className={`aui-diffs-decision is-${decision}`} aria-label={label}>
      {label}
    </span>
  )
}

export function ChatDiffsPanel({
  activity,
  reviewUrl,
  sandboxSessionId,
  refreshing,
  busy,
  reviewBusy,
  onRefreshGit,
  onKeep,
  onReject,
  onKeepAll,
  onRejectAll,
  onRejectHunks,
  onCommit,
  onClose,
}: {
  activity: ChatReviewActivity
  reviewUrl?: string
  sandboxSessionId?: string
  refreshing?: boolean
  /** Agent turn still running — keep Diffs live but plain. */
  busy?: boolean
  /** Keep / Reject / Commit in flight. */
  reviewBusy?: boolean
  onRefreshGit?: () => void
  onKeep?: (path: string) => void
  onReject?: (path: string) => void
  onKeepAll?: () => void
  onRejectAll?: () => void
  /** Reject selected hunk indexes for the selected file (unified diffs only). */
  onRejectHunks?: (path: string, rejectIndexes: number[]) => void
  onCommit?: (message: string) => void
  onClose?: () => void
}) {
  const diffs = activity.diffs
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [commitMsg, setCommitMsg] = useState('')
  const [rejectedHunks, setRejectedHunks] = useState<Set<number>>(() => new Set())
  const selected = useMemo(() => {
    if (!diffs.length) return null
    const hit = selectedPath ? diffs.find((d) => d.path === selectedPath) : null
    return hit || diffs[0]!
  }, [diffs, selectedPath])

  const effectiveReview = reviewUrl || activity.reviewUrl
  const counts = useMemo(() => countDiffDecisions(activity), [activity])
  const canReview = Boolean(onKeep && onReject) && !busy
  const selectedDecision = selected ? diffDecisionFor(activity, selected.path) : 'pending'

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

  const hunks = useMemo(() => {
    if (!selected || !looksLikeUnifiedDiff(selected.text)) return []
    return splitPatchHunks(selected.text || '')
  }, [selected])

  useEffect(() => {
    setRejectedHunks(new Set())
  }, [selected?.path, selected?.at])

  const toggleHunkReject = (index: number) => {
    setRejectedHunks((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <section className="aui-review-panel aui-diffs-panel" aria-label="Diffs">
      <header className="aui-review-head">
        <div className="aui-review-title">
          <span>Diffs</span>
          <span className="aui-review-count" aria-hidden>
            {diffs.length}
          </span>
          {counts.kept || counts.rejected ? (
            <span className="aui-diffs-counts" title="Keep / Reject tally">
              {counts.kept ? `${counts.kept} kept` : null}
              {counts.kept && counts.rejected ? ' · ' : null}
              {counts.rejected ? `${counts.rejected} rejected` : null}
            </span>
          ) : null}
        </div>
        <div className="aui-review-actions">
          {sandboxSessionId && onRefreshGit ? (
            <button
              type="button"
              className="aui-review-btn"
              disabled={refreshing || reviewBusy}
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
          <strong>Keep</strong> / <strong>Reject</strong> to review, then Commit on a linked
          Internal sandbox — or open a PR when GitHub is bound.
        </p>
      ) : (
        <div className="aui-diffs-body">
          {canReview && counts.pending > 1 ? (
            <div className="aui-diffs-bulk" role="group" aria-label="Bulk review">
              <button
                type="button"
                className="aui-review-btn aui-diffs-keep"
                disabled={reviewBusy}
                onClick={() => onKeepAll?.()}
              >
                Keep all
              </button>
              <button
                type="button"
                className="aui-review-btn aui-diffs-reject"
                disabled={reviewBusy}
                onClick={() => onRejectAll?.()}
              >
                Reject all
              </button>
            </div>
          ) : null}
          <ul className="aui-diffs-list">
            {diffs.map((d: ChatDiffEntry) => {
              const dec = diffDecisionFor(activity, d.path)
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    className={`aui-diffs-file${selected?.path === d.path ? ' is-on' : ''}${d.text?.trim() ? ' has-text' : ''}${dec !== 'pending' ? ` is-${dec}` : ''}`}
                    onClick={() => setSelectedPath(d.path)}
                  >
                    <span className="aui-diffs-source" data-source={d.source}>
                      {d.source === 'git' ? 'git' : d.source === 'workspace' ? 'ws' : 'sbx'}
                    </span>
                    <span className="aui-diffs-path">{d.path}</span>
                    <DecisionBadge decision={dec} />
                  </button>
                </li>
              )
            })}
          </ul>
          {selected ? (
            <>
              {canReview && selectedDecision === 'pending' ? (
                <div className="aui-diffs-file-actions" role="group" aria-label={`Review ${selected.path}`}>
                  <button
                    type="button"
                    className="aui-review-btn aui-diffs-keep"
                    disabled={reviewBusy}
                    onClick={() => onKeep?.(selected.path)}
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    className="aui-review-btn aui-diffs-reject"
                    disabled={reviewBusy}
                    onClick={() => onReject?.(selected.path)}
                  >
                    Reject
                  </button>
                  {hunks.length > 1 && onRejectHunks ? (
                    <button
                      type="button"
                      className="aui-review-btn"
                      disabled={reviewBusy || rejectedHunks.size === 0}
                      title="Rewrite file discarding marked hunks"
                      onClick={() => onRejectHunks(selected.path, [...rejectedHunks])}
                    >
                      Apply hunk picks
                    </button>
                  ) : null}
                </div>
              ) : null}
              {selectedDecision === 'kept' ? (
                <p className="aui-diffs-status is-kept">Kept — staged for Commit when ready.</p>
              ) : null}
              {selectedDecision === 'rejected' ? (
                <p className="aui-diffs-status is-rejected">Rejected — reverted in the sandbox.</p>
              ) : null}
              {hunks.length > 1 && selectedDecision === 'pending' ? (
                <ul className="aui-diffs-hunks" aria-label="Hunks">
                  {hunks.map((h) => {
                    const marked = rejectedHunks.has(h.index)
                    return (
                      <li key={h.index}>
                        <button
                          type="button"
                          className={`aui-diffs-hunk${marked ? ' is-reject' : ''}`}
                          disabled={reviewBusy || !canReview}
                          onClick={() => toggleHunkReject(h.index)}
                          title={marked ? 'Will reject this hunk' : 'Mark hunk to reject'}
                        >
                          <span className="aui-diffs-hunk-mark">{marked ? 'Reject' : 'Keep'}</span>
                          <span className="aui-diffs-hunk-head">{h.header}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
              {previewText ? (
                <DiffPreview text={previewText} path={selected.path} busy={busy} />
              ) : (
                <p className="aui-review-empty aui-diffs-missing">
                  No patch text for <code>{selected.path}</code> yet — re-run the write or refresh{' '}
                  <strong>git diff</strong>.
                </p>
              )}
            </>
          ) : null}

          {canReview && onCommit && sandboxSessionId && counts.kept > 0 ? (
            <form
              className="aui-diffs-commit"
              onSubmit={(e) => {
                e.preventDefault()
                const msg = sanitizeCommitMessage(commitMsg)
                if (!msg || reviewBusy) return
                onCommit(msg)
              }}
            >
              <label className="aui-diffs-commit-label" htmlFor="aui-diff-commit-msg">
                Commit kept ({counts.kept})
              </label>
              <div className="aui-diffs-commit-row">
                <input
                  id="aui-diff-commit-msg"
                  className="aui-diffs-commit-input"
                  type="text"
                  value={commitMsg}
                  disabled={reviewBusy}
                  placeholder="Commit message"
                  maxLength={500}
                  onChange={(e) => setCommitMsg(e.target.value)}
                />
                <button
                  type="submit"
                  className="aui-review-btn aui-diffs-commit-btn"
                  disabled={reviewBusy || !sanitizeCommitMessage(commitMsg)}
                >
                  {reviewBusy ? '…' : 'Commit'}
                </button>
              </div>
              <p className="aui-diffs-commit-hint">
                Commits in the sandbox git session. Open PR stays available after push/tools.
              </p>
            </form>
          ) : null}
        </div>
      )}
    </section>
  )
}
