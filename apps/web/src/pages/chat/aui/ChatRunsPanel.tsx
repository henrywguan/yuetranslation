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
          Sandbox <code>exec</code> output streams here — read-only over existing tools.
        </p>
      ) : (
        <ul className="aui-runs-list">
          {runs.map((run) => {
            const failed = run.ok === false || (typeof run.exitCode === 'number' && run.exitCode !== 0)
            return (
              <li key={run.id} className={`aui-run${failed ? ' is-fail' : ''}`}>
                <div className="aui-run-cmd">
                  <span className="aui-run-prompt" aria-hidden>
                    $
                  </span>
                  <code>{formatArgv(run.argv)}</code>
                  {typeof run.exitCode === 'number' ? (
                    <span className="aui-run-code">exit {run.exitCode}</span>
                  ) : null}
                </div>
                {run.stdout?.trim() ? (
                  <pre className="aui-run-out">{run.stdout}</pre>
                ) : null}
                {run.stderr?.trim() ? (
                  <pre className="aui-run-err">{run.stderr}</pre>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
