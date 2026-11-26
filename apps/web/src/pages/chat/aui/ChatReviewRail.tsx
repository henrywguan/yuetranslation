import { useState } from 'react'
import type { ChatReviewActivity, ReviewPaneTab } from '../../../lib/chatReviewActivity'
import { ChatDiffsPanel } from './ChatDiffsPanel'
import { ChatRunsPanel } from './ChatRunsPanel'

export function ChatReviewRail({
  activity,
  reviewUrl,
  sandboxSessionId,
  refreshing,
  busy,
  reviewBusy,
  sheet,
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
  /** Agent turn still running — Diffs stay live but plain. */
  busy?: boolean
  reviewBusy?: boolean
  sheet?: boolean
  onRefreshGit?: () => void
  onKeep?: (path: string) => void
  onReject?: (path: string) => void
  onKeepAll?: () => void
  onRejectAll?: () => void
  onRejectHunks?: (path: string, rejectIndexes: number[]) => void
  onCommit?: (message: string) => void
  onClose?: () => void
}) {
  const [tab, setTab] = useState<ReviewPaneTab>(() =>
    activity.runs.length && !activity.diffs.length ? 'runs' : 'diffs',
  )

  return (
    <aside
      className={`aui-review-rail${sheet ? ' is-sheet' : ''}`}
      aria-label="Review surfaces"
    >
      <div className="aui-review-tabs" role="tablist" aria-label="Diffs and runs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'diffs'}
          className={`aui-review-tab${tab === 'diffs' ? ' is-on' : ''}`}
          onClick={() => setTab('diffs')}
        >
          Diffs
          {activity.diffs.length ? (
            <span className="aui-review-tab-count">{activity.diffs.length}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'runs'}
          className={`aui-review-tab${tab === 'runs' ? ' is-on' : ''}`}
          onClick={() => setTab('runs')}
        >
          Runs
          {activity.runs.length ? (
            <span className="aui-review-tab-count">{activity.runs.length}</span>
          ) : null}
        </button>
        {onClose ? (
          <button
            type="button"
            className="aui-review-btn aui-review-btn--quiet aui-review-rail-close"
            aria-label="Close review pane"
            onClick={onClose}
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="aui-review-rail-body">
        {tab === 'diffs' ? (
          <ChatDiffsPanel
            activity={activity}
            reviewUrl={reviewUrl}
            sandboxSessionId={sandboxSessionId}
            refreshing={refreshing}
            busy={busy}
            reviewBusy={reviewBusy}
            onRefreshGit={onRefreshGit}
            onKeep={onKeep}
            onReject={onReject}
            onKeepAll={onKeepAll}
            onRejectAll={onRejectAll}
            onRejectHunks={onRejectHunks}
            onCommit={onCommit}
          />
        ) : (
          <ChatRunsPanel activity={activity} />
        )}
      </div>
    </aside>
  )
}
