import type { ChatInboxAgent, ChatInboxProject } from '../../../lib/chatInbox'

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  queued: 'Queued',
  working: 'Working',
  needs_attention: 'Attention',
  in_review: 'Review',
  done: 'Done',
}

export function ProjectPanel({
  project,
  agents,
  onSpawnWorker,
  onOpenAgent,
  onMemoryChange,
}: {
  project: ChatInboxProject
  agents: ChatInboxAgent[]
  onSpawnWorker: () => void
  onOpenAgent: (agent: ChatInboxAgent) => void
  onMemoryChange: (memory: string) => void
}) {
  const workers = agents.filter((a) => a.projectId === project.id && a.role === 'worker')
  const overseer = agents.find((a) => a.id === project.overseerAgentId) ||
    agents.find((a) => a.projectId === project.id && a.role === 'overseer')

  return (
    <section className="inbox-section inbox-project-panel" aria-label={`${project.title} overseer`}>
      <div className="inbox-section-head">
        <span className="inbox-section-toggle" style={{ cursor: 'default' }}>
          {project.title}
        </span>
      </div>
      <p className="inbox-empty" style={{ paddingTop: 0 }}>
        Overseer plans · workers implement · statuses drive the tiles above.
      </p>
      <div className="inbox-project-actions">
        {overseer ? (
          <button type="button" className="inbox-new-chat" onClick={() => onOpenAgent(overseer)}>
            Open Overseer
          </button>
        ) : null}
        <button type="button" className="inbox-new-chat" onClick={onSpawnWorker}>
          + Spawn worker
        </button>
      </div>
      <label className="inbox-memory">
        <span className="inbox-agents-label">Project memory</span>
        <textarea
          value={project.memory || ''}
          rows={3}
          placeholder="Shared notes for Overseer + workers…"
          onChange={(e) => onMemoryChange(e.target.value)}
        />
      </label>
      {workers.length ? (
        <ul className="inbox-list">
          {workers.map((w) => (
            <li key={w.id} className="inbox-list-item">
              <button type="button" className="inbox-list-btn" onClick={() => onOpenAgent(w)}>
                {w.title}
              </button>
              <span className={`inbox-agent-status is-${w.status}`}>
                {STATUS_LABEL[w.status] || w.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="inbox-empty">No workers yet — spawn one to run a DeepSeek turn with the worker role.</p>
      )}
    </section>
  )
}
