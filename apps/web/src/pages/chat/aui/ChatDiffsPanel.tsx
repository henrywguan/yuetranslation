import { useMemo, useState } from 'react'
import type { ChatDiffEntry, ChatReviewActivity } from '../../../lib/chatReviewActivity'

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
            <a
              className="aui-review-btn aui-review-btn--pr"
              href={effectiveReview}
              target="_blank"
              rel="noreferrer"
            >
              Open PR
            </a>
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
          Sandbox and workspace writes appear here. Open a PR from chat when GitHub is linked.
        </p>
      ) : (
        <div className="aui-diffs-body">
          <ul className="aui-diffs-list">
            {diffs.map((d: ChatDiffEntry) => (
              <li key={d.id}>
                <button
                  type="button"
                  className={`aui-diffs-file${selected?.path === d.path ? ' is-on' : ''}`}
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
            <pre className="aui-diffs-preview" tabIndex={0}>
              {selected.text?.trim()
                ? selected.text
                : '/* written in sandbox — open git diff or re-run to see patch */'}
            </pre>
          ) : null}
        </div>
      )}
    </section>
  )
}
