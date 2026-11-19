import { useEffect, useState } from 'react'
import type { ChatInboxProject, ThreadAgentView } from '../../../lib/chatInbox'
import { ChatProjectMenu } from './ChatProjectMenu'
import { ArchiveIcon, DeleteIcon } from './InboxIcons'
import { StatusChip } from './StatusChip'

export function ProjectList({
  projects,
  allProjects,
  activeProjectId,
  expandedProjectIds,
  projectChildren,
  activeThreadId,
  open,
  dimEmpty,
  createDisabled,
  onToggle,
  onSelect,
  onToggleExpand,
  onOpenView,
  onArchiveThread,
  onDeleteThread,
  onAddChatToProject,
  onRemoveChatFromProject,
  onCreate,
  onRename,
  onDelete,
}: {
  projects: ChatInboxProject[]
  /** Full project list for Add-to-Project menus (not just visible/filtered). */
  allProjects: ChatInboxProject[]
  activeProjectId: string | null
  expandedProjectIds: ReadonlySet<string>
  /** Filtered nested agent/thread rows keyed by project id. */
  projectChildren: Map<string, ThreadAgentView[]>
  activeThreadId?: string | null
  open: boolean
  /** When a status/search filter is active, dim folders with no matching children. */
  dimEmpty?: boolean
  createDisabled?: boolean
  onToggle: () => void
  onSelect: (projectId: string | null) => void
  onToggleExpand: (projectId: string) => void
  onOpenView: (view: ThreadAgentView) => void
  onArchiveThread?: (threadId: string) => void
  onDeleteThread?: (threadId: string) => void
  onAddChatToProject?: (threadId: string, projectId: string) => void
  onRemoveChatFromProject?: (threadId: string) => void
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
          <ul className="inbox-list inbox-project-tree">
            {projects.map((p) => {
              const active = activeProjectId === p.id
              const editing = editingId === p.id
              const expanded = expandedProjectIds.has(p.id)
              const children = projectChildren.get(p.id) || []
              const dimmed = Boolean(dimEmpty && children.length === 0 && !active)
              return (
                <li
                  key={p.id}
                  className={`inbox-project-node${active ? ' is-active' : ''}${dimmed ? ' is-dimmed' : ''}`}
                >
                  <div className={`inbox-list-item inbox-project-row${active ? ' is-active' : ''}`}>
                    <button
                      type="button"
                      className={`inbox-project-expand${expanded ? ' is-open' : ''}`}
                      aria-label={expanded ? `Collapse ${p.title}` : `Expand ${p.title}`}
                      aria-expanded={expanded}
                      onClick={() => onToggleExpand(p.id)}
                    >
                      ▸
                    </button>
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
                        title="Click to open Overseer · double-click to rename"
                        onClick={() => {
                          if (!expanded) {
                            onToggleExpand(p.id)
                            onSelect(p.id)
                            return
                          }
                          onSelect(active ? null : p.id)
                        }}
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
                    <span className="inbox-list-meta" title="Agents & chats in project">
                      {children.length}
                    </span>
                    <button
                      type="button"
                      className="inbox-list-del"
                      aria-label={`Delete ${p.title}`}
                      onClick={() => onDelete(p.id)}
                    >
                      ×
                    </button>
                  </div>
                  {expanded ? (
                    children.length ? (
                      <ul className="inbox-project-children" aria-label={`${p.title} agents`}>
                        {children.map((v) => {
                          const threadActive = Boolean(v.threadId && v.threadId === activeThreadId)
                          const canArchive = Boolean(v.threadId && onArchiveThread)
                          const canDelete = Boolean(v.threadId && onDeleteThread)
                          const canMoveChat =
                            Boolean(v.threadId) &&
                            v.role === 'thread' &&
                            Boolean(onAddChatToProject || onRemoveChatFromProject)
                          return (
                            <li
                              key={v.id}
                              className={`inbox-list-item inbox-agent-row${threadActive ? ' is-active' : ''}${canMoveChat ? ' has-chat-menu' : ''}`}
                            >
                              <button
                                type="button"
                                className="inbox-list-btn inbox-agent-trigger"
                                onClick={() => onOpenView(v)}
                                title={v.role === 'overseer' ? 'Overseer' : v.role}
                              >
                                {v.role === 'overseer' ? (
                                  <span className="inbox-agent-role inbox-agent-role--overseer">
                                    Overseer ·{' '}
                                  </span>
                                ) : v.role === 'worker' ? (
                                  <span className="inbox-agent-role">Worker · </span>
                                ) : null}
                                {v.title}
                              </button>
                              <StatusChip status={v.status} />
                              {canMoveChat && v.threadId ? (
                                <ChatProjectMenu
                                  projects={allProjects}
                                  currentProjectId={v.projectId}
                                  canRemove
                                  onAddToProject={(projectId) =>
                                    onAddChatToProject?.(v.threadId, projectId)
                                  }
                                  onRemoveFromProject={() =>
                                    onRemoveChatFromProject?.(v.threadId)
                                  }
                                />
                              ) : null}
                              {canArchive ? (
                                <button
                                  type="button"
                                  className="inbox-list-action"
                                  title="Archive"
                                  aria-label={`Archive ${v.title}`}
                                  onClick={() => onArchiveThread?.(v.threadId)}
                                >
                                  <ArchiveIcon />
                                </button>
                              ) : null}
                              {canDelete ? (
                                <button
                                  type="button"
                                  className="inbox-list-action"
                                  title="Delete"
                                  aria-label={`Delete ${v.title}`}
                                  onClick={() => onDeleteThread?.(v.threadId)}
                                >
                                  <DeleteIcon />
                                </button>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <div className="inbox-empty inbox-empty--block inbox-project-children-empty">
                        <p>No matching agents in this project.</p>
                      </div>
                    )
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="inbox-empty inbox-empty--block">
            <p>No projects yet — create one so Overseer can nest workers here.</p>
            <button type="button" className="inbox-empty-cta" onClick={onCreate}>
              New project
            </button>
          </div>
        )
      ) : null}
    </section>
  )
}
