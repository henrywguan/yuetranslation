import { useEffect, useState } from 'react'
import type { ChatInboxProject } from '../../../lib/chatInbox'

export function ProjectList({
  projects,
  activeProjectId,
  open,
  createDisabled,
  onToggle,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  projects: ChatInboxProject[]
  activeProjectId: string | null
  open: boolean
  createDisabled?: boolean
  onToggle: () => void
  onSelect: (projectId: string | null) => void
  onCreate: () => void
  onRename: (projectId: string, title: string) => void
  onDelete: (projectId: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!editingId) return
    const stillThere = projects.some((p) => p.id === editingId)
    if (!stillThere) setEditingId(null)
  }, [editingId, projects])

  const commitRename = (projectId: string) => {
    onRename(projectId, draft)
    setEditingId(null)
  }

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
              const editing = editingId === p.id
              return (
                <li key={p.id} className={`inbox-list-item${active ? ' is-active' : ''}`}>
                  {editing ? (
                    <form
                      className="inbox-list-rename"
                      onSubmit={(e) => {
                        e.preventDefault()
                        commitRename(p.id)
                      }}
                    >
                      <input
                        value={draft}
                        aria-label={`Rename ${p.title}`}
                        autoFocus
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commitRename(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            setEditingId(null)
                          }
                        }}
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="inbox-list-btn"
                      title="Click to open · double-click to rename"
                      onClick={() => onSelect(active ? null : p.id)}
                      onDoubleClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDraft(p.title)
                        setEditingId(p.id)
                      }}
                    >
                      {p.title}
                    </button>
                  )}
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
          <p className="inbox-empty">Create a Project to open an Overseer that orchestrates workers.</p>
        )
      ) : null}
    </section>
  )
}
