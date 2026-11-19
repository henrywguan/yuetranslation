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
    <section className="inbox-section inbox-project-panel" aria-label={`${project.title} memory`}>
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
            <span aria-hidden>· Memory</span>
          </button>
        )}
      </div>
      <p className="inbox-empty" style={{ paddingTop: 0 }}>
        Agents nest under this project above. Describe work in the Overseer chat — it plans and creates
        workers.
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
    </section>
  )
}
