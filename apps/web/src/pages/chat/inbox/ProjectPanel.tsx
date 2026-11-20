import { useEffect, useState } from 'react'
import type { ChatInboxAgent, ChatInboxProject } from '../../../lib/chatInbox'

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
  onRename,
  onMemoryChange,
}: {
  project: ChatInboxProject
  agents: ChatInboxAgent[]
  onOpenAgent: (agent: ChatInboxAgent) => void
  onRename?: (title: string) => void
  onMemoryChange: (memory: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project.title)
  const overseer =
    agents.find((a) => a.id === project.overseerAgentId) ||
    agents.find((a) => a.projectId === project.id && a.role === 'overseer')

  useEffect(() => {
    if (!editing) setDraft(project.title)
  }, [editing, project.title])

  const commitRename = () => {
    onRename?.(draft)
    setEditing(false)
  }

  return (
    <section className="inbox-section inbox-project-panel" aria-label={`${project.title} rules`}>
      <div className="inbox-section-head">
        {editing && onRename ? (
          <form
            className="inbox-list-rename inbox-list-rename--panel"
            onSubmit={(e) => {
              e.preventDefault()
              commitRename()
            }}
          >
            <input
              value={draft}
              aria-label="Rename project"
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setEditing(false)
                }
              }}
            />
          </form>
        ) : (
          <button
            type="button"
            className="inbox-section-toggle"
            onClick={() => {
              if (overseer) onOpenAgent(overseer)
            }}
            onDoubleClick={(e) => {
              if (!onRename) return
              e.preventDefault()
              e.stopPropagation()
              setDraft(project.title)
              setEditing(true)
            }}
            title="Focus Overseer chat · double-click to rename"
          >
            {project.title}
            <span aria-hidden>· Rules</span>
          </button>
        )}
      </div>
      <div className="inbox-rules-card">
        <div className="inbox-rules-head">
          <span className="inbox-rules-title">Project Rules</span>
          <span className="inbox-rules-hint">Shared with Overseer + workers</span>
        </div>
        <p className="inbox-empty inbox-rules-copy">
          First-class memory for this Project — not buried. Agents nest in the folder above; chat the
          Overseer and it plans workers from these rules.
        </p>
        <label className="inbox-memory inbox-memory--rules">
          <span className="visually-hidden">Project Rules</span>
          <textarea
            value={project.memory || ''}
            rows={6}
            placeholder="Conventions, goals, repo notes, tone — anything Overseer should remember…"
            onChange={(e) => onMemoryChange(e.target.value)}
          />
        </label>
      </div>
    </section>
  )
}
