import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAuiState,
} from '@assistant-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { createChatSandbox } from '../../../lib/api'
import {
  buildAgentViews,
  countByFilter,
  filterAgentViews,
  matchesSearch,
  projectNestedViews,
  ungroupedAgentViews,
  type ChatInboxAgent,
  type ChatInboxProject,
  type ChatInboxWorkspaceKind,
  type InboxFilter,
  type ThreadAgentView,
} from '../../../lib/chatInbox'
import { CHAT_THREAD_DRAG_MIME } from '../../../lib/chatPrChecks'
import { useChatAuiSession } from '../aui/ChatAuiRuntime'
import { ArchiveList } from './ArchiveList'
import { ChatProjectMenu } from './ChatProjectMenu'
import { useChatInboxContext } from './ChatInboxContext'
import { FilterTiles } from './FilterTiles'
import './Inbox.css'
import { ArchiveIcon, DeleteIcon } from './InboxIcons'
import { InboxSettingsMenu } from './InboxSettingsMenu'
import { GithubBind } from './GithubBind'
import { LocalFolderBind } from './LocalFolderBind'
import { ProjectCreateWizard, type ProjectWizardWorkspace } from './ProjectCreateWizard'
import { ProjectList } from './ProjectList'
import { ProjectPanel } from './ProjectPanel'
import { StatusChip } from './StatusChip'
import { WorkspaceList } from './WorkspaceList'

/** Narrow phones + short desktop drawers start with Projects/Workspaces collapsed. */
function inboxSecondaryDefaultOpen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const narrow = window.matchMedia('(max-width: 899px)').matches
    const short = window.matchMedia('(max-height: 720px)').matches
    return !(narrow || short)
  } catch {
    return true
  }
}

export function InboxShell({ onNavigate }: { onNavigate?: () => void }) {
  const {
    threads,
    activeId,
    busy,
    startNewChat,
    selectThread,
    archiveThread,
    removeThread,
  } = useChatAuiSession()
  const {
    state,
    addProject,
    removeProject,
    renameProjectTitle,
    linkThread,
    unlinkThread,
    addWorkspace,
    removeWorkspace,
    bindWorkspaceRef,
    bindAgentThread,
    updateProjectMemory,
  } = useChatInboxContext()
  const [sandboxBusy, setSandboxBusy] = useState(false)
  const [sandboxNote, setSandboxNote] = useState<string | null>(null)
  const [localBindWorkspaceId, setLocalBindWorkspaceId] = useState<string | null>(null)
  const [githubBindWorkspaceId, setGithubBindWorkspaceId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardBusy, setWizardBusy] = useState(false)
  const [wizardError, setWizardError] = useState<string | null>(null)

  const [filter, setFilter] = useState<InboxFilter>('all')
  const [query, setQuery] = useState('')
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set())
  // Initial open only — user expands stay open (no resize force-collapse).
  const [projectsOpen, setProjectsOpen] = useState(() => inboxSecondaryDefaultOpen())
  const [workspacesOpen, setWorkspacesOpen] = useState(() => inboxSecondaryDefaultOpen())
  const [archiveOpen, setArchiveOpen] = useState(false)
  const collapseProjects = () => {
    setProjectsOpen(false)
    setActiveProjectId(null)
  }

  const toggleProjects = () => {
    if (projectsOpen) collapseProjects()
    else setProjectsOpen(true)
  }

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const expandProject = (projectId: string) => {
    setExpandedProjectIds((prev) => {
      if (prev.has(projectId)) return prev
      const next = new Set(prev)
      next.add(projectId)
      return next
    })
  }

  const openAgent = (agent: ChatInboxAgent) => {
    if (agent.threadId && threads.some((t) => t.id === agent.threadId)) {
      selectThread(agent.threadId)
      onNavigate?.()
      return
    }
    const threadId = startNewChat()
    bindAgentThread(agent.id, threadId)
    if (agent.projectId) linkThread(agent.projectId, threadId)
    onNavigate?.()
  }

  const openView = (view: ThreadAgentView) => {
    if (view.source === 'agent') {
      const agent = state.agents.find((a) => a.id === view.id)
      if (agent) {
        if (agent.projectId) expandProject(agent.projectId)
        openAgent(agent)
        return
      }
    }
    if (view.threadId && threads.some((t) => t.id === view.threadId)) {
      if (view.projectId) expandProject(view.projectId)
      selectThread(view.threadId)
      onNavigate?.()
    }
  }

  /** Open name + workspace wizard (not name-only draft). */
  const openProjectWizard = () => {
    setWizardError(null)
    setWizardOpen(true)
    setProjectsOpen(true)
  }

  /** New Project → Overseer chat + optional workspace bind (no manual spawn UI). */
  const createAndFocusProject = async (opts: {
    title: string
    workspace: ProjectWizardWorkspace
  }) => {
    if (wizardBusy) return
    setWizardBusy(true)
    setWizardError(null)
    try {
      const { project, overseer } = addProject(opts.title)
      const threadId = startNewChat()
      bindAgentThread(overseer.id, threadId)
      linkThread(project.id, threadId)
      setActiveProjectId(project.id)
      expandProject(project.id)
      setProjectsOpen(true)

      if (opts.workspace === 'internal') {
        const ws = addWorkspace('internal', 'Internal sandbox', project.id)
        const { session, note, fallbackFromFly } = await createChatSandbox({
          title: `${opts.title} sandbox`,
          projectId: project.id,
          driver: 'stub',
        })
        bindWorkspaceRef(ws.id, session.id, project.id)
        setSandboxNote(
          note ||
            (fallbackFromFly
              ? 'Fly not configured — using stub sandbox.'
              : `Sandbox ready (${session.driver}).`),
        )
        setWorkspacesOpen(true)
      } else if (opts.workspace === 'local') {
        const ws = addWorkspace('local', 'Local folder', project.id)
        setLocalBindWorkspaceId(ws.id)
        setWorkspacesOpen(true)
      } else if (opts.workspace === 'github') {
        const ws = addWorkspace('github', 'GitHub repo', project.id)
        setGithubBindWorkspaceId(ws.id)
        setWorkspacesOpen(true)
      }

      setWizardOpen(false)
      onNavigate?.()
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Project create failed')
    } finally {
      setWizardBusy(false)
    }
  }

  const selectProject = (projectId: string | null) => {
    setActiveProjectId(projectId)
    if (!projectId) return
    expandProject(projectId)
    const project = state.projects.find((p) => p.id === projectId)
    const overseer =
      (project?.overseerAgentId
        ? state.agents.find((a) => a.id === project.overseerAgentId)
        : undefined) ||
      state.agents.find((a) => a.projectId === projectId && a.role === 'overseer')
    if (overseer) openAgent(overseer)
  }

  const addChatToProject = (threadId: string, projectId: string) => {
    linkThread(projectId, threadId)
    expandProject(projectId)
    setProjectsOpen(true)
  }

  const removeChatFromProject = (threadId: string) => {
    unlinkThread(threadId)
  }

  const createWorkspaceKind = async (kind: ChatInboxWorkspaceKind) => {
    if (kind === 'internal') {
      if (sandboxBusy) return
      setSandboxBusy(true)
      setSandboxNote(null)
      try {
        const ws = addWorkspace('internal', 'Internal sandbox', activeProjectId || undefined)
        const { session, note, fallbackFromFly } = await createChatSandbox({
          title: ws.title,
          projectId: activeProjectId || undefined,
          driver: 'stub',
        })
        bindWorkspaceRef(ws.id, session.id, activeProjectId || undefined)
        setSandboxNote(
          note ||
            (fallbackFromFly
              ? 'Fly not configured — using stub sandbox.'
              : `Sandbox ready (${session.driver}).`),
        )
      } catch (err) {
        setSandboxNote(err instanceof Error ? err.message : 'Sandbox create failed')
      } finally {
        setSandboxBusy(false)
        setWorkspacesOpen(true)
      }
      return
    }
    if (kind === 'local') {
      const ws = addWorkspace('local', 'Local folder', activeProjectId || undefined)
      setLocalBindWorkspaceId(ws.id)
      setWorkspacesOpen(true)
      return
    }
    if (kind === 'github') {
      const ws = addWorkspace('github', 'GitHub repo', activeProjectId || undefined)
      setGithubBindWorkspaceId(ws.id)
      setWorkspacesOpen(true)
      return
    }
    addWorkspace(kind, undefined, activeProjectId || undefined)
    setWorkspacesOpen(true)
  }

  const activeSandboxSessionId = (() => {
    const internal = state.workspaces.find(
      (w) => w.kind === 'internal' && w.ref?.startsWith('sbx_'),
    )
    return internal?.ref
  })()

  const views = useMemo(
    () =>
      buildAgentViews({
        agents: state.agents,
        projects: state.projects,
        threads,
        busy,
        activeId,
      }),
    [activeId, busy, state.agents, state.projects, threads],
  )

  const counts = useMemo(() => countByFilter(views), [views])

  /** Status/search filter across the whole Inbox — not scoped to the focused project. */
  const filtered = useMemo(() => {
    const base = filterAgentViews(views, filter, null)
    return base.filter((v) => matchesSearch(v.title, query))
  }, [filter, query, views])

  const projectChildren = useMemo(() => {
    const map = new Map<string, ThreadAgentView[]>()
    for (const p of state.projects) {
      map.set(p.id, projectNestedViews(filtered, p.id))
    }
    return map
  }, [filtered, state.projects])

  const filterActive = filter !== 'all' || Boolean(query.trim())

  const visibleProjects = useMemo(() => {
    if (!filterActive) return state.projects
    return state.projects.filter((p) => {
      if (p.id === activeProjectId) return true
      return (projectChildren.get(p.id) || []).length > 0
    })
  }, [activeProjectId, filterActive, projectChildren, state.projects])

  const ungrouped = useMemo(() => ungroupedAgentViews(filtered), [filtered])

  const ungroupedByThreadId = useMemo(() => {
    const map = new Map<string, ThreadAgentView>()
    for (const v of ungrouped) {
      if (v.threadId) map.set(v.threadId, v)
    }
    return map
  }, [ungrouped])

  const orphanUngroupedAgents = useMemo(
    () =>
      ungrouped.filter(
        (v) =>
          v.source === 'agent' &&
          v.role !== 'thread' &&
          (!v.threadId || !threads.some((t) => t.id === v.threadId)),
      ),
    [threads, ungrouped],
  )

  const inboxZero =
    !filterActive &&
    state.projects.length === 0 &&
    ungrouped.length === 0 &&
    orphanUngroupedAgents.length === 0

  // Status filters auto-expand matching project folders (Cursor-like discoverability).
  useEffect(() => {
    if (!filterActive) return
    setExpandedProjectIds((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const p of state.projects) {
        if ((projectChildren.get(p.id) || []).length > 0 && !next.has(p.id)) {
          next.add(p.id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [filterActive, projectChildren, state.projects])

  const activeProject = activeProjectId
    ? state.projects.find((p) => p.id === activeProjectId) || null
    : null

  const chatsLabel =
    filter === 'all'
      ? 'Chats'
      : filter === 'needs_attention'
        ? 'Attention'
        : filter === 'in_review'
          ? 'Review'
          : 'Working'

  const startUngroupedChat = () => {
    startNewChat()
    onNavigate?.()
  }

  return (
    <div className="inbox-shell">
      <div className="inbox-header">
        <h2 className="inbox-header-title">Inbox</h2>
        <div className="inbox-header-actions">
          <InboxSettingsMenu />
          <button
            type="button"
            className="inbox-header-new"
            aria-label="New project"
            title="New project"
            disabled={wizardOpen}
            onClick={() => {
              openProjectWizard()
            }}
          >
            +
          </button>
        </div>
      </div>

      <label className="inbox-search">
        <span className="aui-sr-only">Search inbox</span>
        <input
          type="search"
          value={query}
          placeholder="Search projects & chats"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="inbox-scroll">
        <FilterTiles filter={filter} counts={counts} onChange={setFilter} />

        {inboxZero ? (
          <div className="inbox-empty inbox-empty--hero" role="status">
            <p>Your Inbox is empty — start a Project so Overseer can nest agents, or open a loose chat.</p>
            <button type="button" className="inbox-empty-cta" onClick={() => openProjectWizard()}>
              New project
            </button>
          </div>
        ) : null}

        <div className="inbox-band">
          <ProjectList
            projects={visibleProjects}
            allProjects={state.projects}
            activeProjectId={activeProjectId}
            expandedProjectIds={expandedProjectIds}
            projectChildren={projectChildren}
            activeThreadId={activeId}
            open={projectsOpen}
            dimEmpty={filterActive}
            createDisabled={wizardOpen}
            onToggle={toggleProjects}
            onSelect={(id) => {
              selectProject(id)
              if (id) setProjectsOpen(true)
            }}
            onToggleExpand={toggleProjectExpand}
            onOpenView={openView}
            onArchiveThread={(threadId) => archiveThread(threadId, true)}
            onDeleteThread={removeThread}
            onAddChatToProject={addChatToProject}
            onRemoveChatFromProject={removeChatFromProject}
            onCreate={() => {
              openProjectWizard()
            }}
            onRename={renameProjectTitle}
            onDelete={(id) => {
              removeProject(id)
              if (activeProjectId === id) setActiveProjectId(null)
              setExpandedProjectIds((prev) => {
                if (!prev.has(id)) return prev
                const next = new Set(prev)
                next.delete(id)
                return next
              })
            }}
          />

          {wizardOpen ? (
            <ProjectCreateWizard
              busy={wizardBusy}
              error={wizardError}
              onConfirm={(opts) => {
                void createAndFocusProject(opts)
              }}
              onCancel={() => {
                setWizardOpen(false)
                setWizardError(null)
              }}
            />
          ) : projectsOpen && activeProject ? (
            <ProjectPanel
              project={activeProject}
              agents={state.agents}
              onOpenAgent={openAgent}
              onRename={(title) => renameProjectTitle(activeProject.id, title)}
              onMemoryChange={(memory) => updateProjectMemory(activeProject.id, memory)}
            />
          ) : null}
        </div>

        <div className="inbox-band">
          <WorkspaceList
            workspaces={state.workspaces}
            open={workspacesOpen}
            onToggle={() => setWorkspacesOpen((v) => !v)}
            onCreate={(kind) => {
              void createWorkspaceKind(kind)
            }}
            onDelete={removeWorkspace}
          />
          {sandboxBusy ? <p className="inbox-empty">Starting sandbox…</p> : null}
          {sandboxNote ? <p className="inbox-empty">{sandboxNote}</p> : null}
          {localBindWorkspaceId ? (
            <LocalFolderBind
              workspaceId={localBindWorkspaceId}
              projectId={activeProjectId || undefined}
              onBound={({ sessionId, note, fileCount }) => {
                bindWorkspaceRef(localBindWorkspaceId, sessionId, activeProjectId || undefined)
                setSandboxNote(`${note} (${fileCount} files)`)
                setLocalBindWorkspaceId(null)
              }}
              onCancel={() => setLocalBindWorkspaceId(null)}
            />
          ) : null}
          {githubBindWorkspaceId ? (
            <GithubBind
              sandboxSessionId={activeSandboxSessionId}
              onBound={({ repo, note, sandboxSessionId }) => {
                bindWorkspaceRef(
                  githubBindWorkspaceId,
                  sandboxSessionId || repo,
                  activeProjectId || undefined,
                )
                setSandboxNote(note)
                setGithubBindWorkspaceId(null)
              }}
              onCancel={() => setGithubBindWorkspaceId(null)}
            />
          ) : null}
        </div>

        <button type="button" className="inbox-new-chat" onClick={startUngroupedChat}>
          + New chat
        </button>

        <div className="inbox-agents" aria-label="Ungrouped chats">
          <div className="inbox-agents-label">{chatsLabel}</div>

          <ThreadListPrimitive.Root className="aui-thread-list">
            <ThreadListPrimitive.Items>
              {() => (
                <InboxThreadItem
                  ungroupedByThreadId={ungroupedByThreadId}
                  projects={state.projects}
                  onNavigate={onNavigate}
                  onAddToProject={addChatToProject}
                  onRemoveFromProject={removeChatFromProject}
                />
              )}
            </ThreadListPrimitive.Items>
          </ThreadListPrimitive.Root>

          {ungrouped.length === 0 && orphanUngroupedAgents.length === 0 ? (
            <div className="inbox-empty inbox-empty--block">
              <p>
                {filter === 'all'
                  ? 'No ungrouped chats — project work nests under Projects.'
                  : 'No ungrouped chats match this filter.'}
              </p>
              {filter === 'all' ? (
                <button type="button" className="inbox-empty-cta" onClick={startUngroupedChat}>
                  New chat
                </button>
              ) : null}
            </div>
          ) : null}

          {orphanUngroupedAgents.length ? (
            <ul className="inbox-list">
              {orphanUngroupedAgents.map((v) => {
                const agent = state.agents.find((a) => a.id === v.id)
                return (
                  <li key={v.id} className="inbox-list-item inbox-agent-row">
                    <button
                      type="button"
                      className="inbox-list-btn inbox-agent-trigger"
                      onClick={() => {
                        if (agent) openAgent(agent)
                      }}
                    >
                      {v.title}
                    </button>
                    <StatusChip status={v.status} />
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>

        <div className="inbox-band">
          <ArchiveList
            threads={threads}
            activeId={activeId}
            open={archiveOpen}
            onToggle={() => setArchiveOpen((v) => !v)}
            onSelect={(threadId) => {
              selectThread(threadId)
              onNavigate?.()
            }}
            onRestore={(threadId) => {
              archiveThread(threadId, false)
              setArchiveOpen(true)
            }}
            onDelete={(threadId) => {
              removeThread(threadId)
            }}
          />
        </div>
      </div>
    </div>
  )
}

function InboxThreadItem({
  ungroupedByThreadId,
  projects,
  onNavigate,
  onAddToProject,
  onRemoveFromProject,
}: {
  ungroupedByThreadId: Map<string, ThreadAgentView>
  projects: ChatInboxProject[]
  onNavigate?: () => void
  onAddToProject: (threadId: string, projectId: string) => void
  onRemoveFromProject: (threadId: string) => void
}) {
  const threadId = useAuiState((s) => s.threadListItem.id)
  const view = ungroupedByThreadId.get(threadId)
  if (!view) return null

  const canDrag = view.role === 'thread' && Boolean(view.threadId)

  return (
    <ThreadListItemPrimitive.Root
      className={`aui-thread-item inbox-agent-row has-chat-menu${canDrag ? ' is-draggable' : ''}`}
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) return
        e.dataTransfer.setData(CHAT_THREAD_DRAG_MIME, view.threadId)
        e.dataTransfer.setData('text/plain', view.threadId)
        e.dataTransfer.effectAllowed = 'move'
      }}
      title={canDrag ? 'Drag onto a Project to nest this chat' : undefined}
    >
      <ThreadListItemPrimitive.Trigger
        className="aui-thread-trigger"
        onClick={() => {
          onNavigate?.()
        }}
      >
        <ThreadListItemPrimitive.Title />
      </ThreadListItemPrimitive.Trigger>
      <StatusChip status={view.status} />
      <ChatProjectMenu
        projects={projects}
        currentProjectId={view.projectId}
        canRemove={view.role === 'thread'}
        onAddToProject={(projectId) => onAddToProject(view.threadId, projectId)}
        onRemoveFromProject={() => onRemoveFromProject(view.threadId)}
      />
      <ThreadListItemPrimitive.Archive
        className="aui-thread-archive is-archive"
        title="Archive (keeps chat — restore later)"
        aria-label="Archive"
      >
        <ArchiveIcon />
      </ThreadListItemPrimitive.Archive>
      <ThreadListItemPrimitive.Delete
        className="aui-thread-delete is-delete"
        title="Delete permanently"
        aria-label="Delete"
      >
        <DeleteIcon />
      </ThreadListItemPrimitive.Delete>
    </ThreadListItemPrimitive.Root>
  )
}
