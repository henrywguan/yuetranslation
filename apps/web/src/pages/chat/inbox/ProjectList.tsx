import type { ChatInboxProject } from '../../../lib/chatInbox'

export function ProjectList({
  projects,
  activeProjectId,
  open,
  createDisabled,
  onToggle,
  onSelect,
  onCreate,
  onDelete,
}: {
  projects: ChatInboxProject[]
  activeProjectId: string | null
  open: boolean
  createDisabled?: boolean
  onToggle: () => void
  onSelect: (projectId: string | null) => void
  onCreate: () => void
  onDelete: (projectId: string) => void
}) {
  return (
    <section className="inbox-section" aria-label="Projects">
      <div className="inbox-section-head">
        <button type="button" className="inbox-section-toggle" onClick={onToggle} aria-expanded={open}>
          <span className={`inbox-section-chevron${open ? ' is-open' : ''}`} aria-hidden>
            ▸
          </span>
          Projects
          <span aria-hidden>· {projects.length}</span>
        </button>
        <button
          type="button"
          className="inbox-section-add"
          aria-label="New project"
          title={createDisabled ? 'Finish or cancel the draft project first' : 'New project'}
          disabled={createDisabled}
          onClick={onCreate}
        >
          +
        </button>
      </div>
      {open ? (
        projects.length ? (
          <ul className="inbox-list">
            {projects.map((p) => {
              const active = activeProjectId === p.id
              return (
                <li key={p.id} className={`inbox-list-item${active ? ' is-active' : ''}`}>
                  <button
                    type="button"
                    className="inbox-list-btn"
                    onClick={() => onSelect(active ? null : p.id)}
                  >
                    {p.title}
                  </button>
                  <span className="inbox-list-meta" title="Threads in project">
                    {p.threadIds.length}
                  </span>
                  <button
                    type="button"
                    className="inbox-list-del"
                    aria-label={`Delete ${p.title}`}
                    onClick={() => onDelete(p.id)}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="inbox-empty">Create a Project to group chats and spawn agents.</p>
        )
      ) : null}
    </section>
  )
}
