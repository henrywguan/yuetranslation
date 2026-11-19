import type { ChatInboxAgent, ChatInboxProject } from '../../../lib/chatInbox'

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  queued: 'Queued',
  working: 'Working',
  needs_attention: 'Attention',
  in_review: 'Review',
  done: 'Done',
}

export function ProjectDraftPanel({
  title,
  onTitleChange,
  onConfirm,
  onCancel,
}: {
  title: string
  onTitleChange: (title: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <section className="inbox-section inbox-project-panel" aria-label="New project draft">
      <div className="inbox-section-head">
        <span className="inbox-section-toggle" style={{ cursor: 'default' }}>
          New project
        </span>
      </div>
      <label className="inbox-memory">
        <span className="inbox-agents-label">Name</span>
        <input
          type="text"
          value={title}
          placeholder="Project name"
          autoFocus
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onConfirm()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
        />
      </label>
      <div className="inbox-project-actions">
        <button type="button" className="inbox-new-chat" onClick={onConfirm}>
          Create project
        </button>
        <button type="button" className="inbox-new-chat inbox-new-chat--quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  )
}

export function ProjectPanel({
  project,
  agents,
  onOpenAgent,
  onMemoryChange,
}: {
  project: ChatInboxProject
  agents: ChatInboxAgent[]
  onOpenAgent: (agent: ChatInboxAgent) => void
  onMemoryChange: (memory: string) => void
}) {
  const workers = agents.filter((a) => a.projectId === project.id && a.role === 'worker')
  const overseer =
    agents.find((a) => a.id === project.overseerAgentId) ||
    agents.find((a) => a.projectId === project.id && a.role === 'overseer')

  return (
    <section className="inbox-section inbox-project-panel" aria-label={`${project.title} overseer`}>
      <div className="inbox-section-head">
        <button
          type="button"
          className="inbox-section-toggle"
          onClick={() => {
            if (overseer) onOpenAgent(overseer)
          }}
          title="Focus Overseer chat"
        >
          {project.title}
          <span aria-hidden>· Overseer</span>
        </button>
      </div>
      <p className="inbox-empty" style={{ paddingTop: 0 }}>
        Describe work in the Overseer chat — it plans, creates workers, and drives the tiles above.
      </p>
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
        <p className="inbox-empty">No workers yet — the Overseer will create them when you assign work.</p>
      )}
    </section>
  )
}
