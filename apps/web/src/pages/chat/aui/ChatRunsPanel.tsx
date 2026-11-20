import { useMemo, useState } from 'react'
import type { ChatReviewActivity } from '../../../lib/chatReviewActivity'
import { formatArgv } from '../../../lib/chatReviewActivity'

export function ChatRunsPanel({
  activity,
  onClose,
}: {
  activity: ChatReviewActivity
  onClose?: () => void
}) {
  const runs = activity.runs
  const [openId, setOpenId] = useState<string | null>(null)
  const effectiveOpen = useMemo(() => {
    if (!runs.length) return null
    if (openId && runs.some((r) => r.id === openId)) return openId
    // Default: expand the newest run (list is newest-first).
    return runs[0]!.id
  }, [openId, runs])

  return (
    <section className="aui-review-panel aui-runs-panel" aria-label="Runs">
      <header className="aui-review-head">
        <div className="aui-review-title">
          <span>Runs</span>
          <span className="aui-review-count" aria-hidden>
            {runs.length}
          </span>
        </div>
        <div className="aui-review-actions">
          {onClose ? (
            <button type="button" className="aui-review-btn aui-review-btn--quiet" onClick={onClose}>
              ×
            </button>
          ) : null}
        </div>
      </header>

      {!runs.length ? (
        <p className="aui-review-empty">
          Sandbox <code>exec</code> output streams here — argv, stdout, and stderr from the last
          commands. Read-only over existing tools.
        </p>
      ) : (
        <ul className="aui-runs-list">
          {runs.map((run) => {
            const failed = run.ok === false || (typeof run.exitCode === 'number' && run.exitCode !== 0)
            const open = run.id === effectiveOpen
            const hasOut = Boolean(run.stdout?.trim() || run.stderr?.trim())
            return (
              <li key={run.id} className={`aui-run${failed ? ' is-fail' : ''}${open ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="aui-run-toggle"
                  aria-expanded={open}
                  onClick={() => setOpenId(run.id)}
                >
                  <span className="aui-run-cmd">
                    <span className="aui-run-prompt" aria-hidden>
                      $
                    </span>
                    <code>{formatArgv(run.argv)}</code>
                    {typeof run.exitCode === 'number' ? (
                      <span className="aui-run-code">exit {run.exitCode}</span>
                    ) : null}
                  </span>
                </button>
                {open ? (
                  <div className="aui-run-body">
                    {run.stdout?.trim() ? <pre className="aui-run-out">{run.stdout}</pre> : null}
                    {run.stderr?.trim() ? <pre className="aui-run-err">{run.stderr}</pre> : null}
                    {!hasOut ? (
                      <p className="aui-run-empty-out">No stdout / stderr captured for this run.</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
