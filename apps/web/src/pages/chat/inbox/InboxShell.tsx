import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAuiState,
} from '@assistant-ui/react'
import { useMemo, useState } from 'react'
import { createChatSandbox } from '../../../lib/api'
import {
  buildAgentViews,
  countByFilter,
  filterAgentViews,
  matchesSearch,
  type ChatInboxAgent,
  type ChatInboxWorkspaceKind,
  type InboxFilter,
  type ThreadAgentView,
} from '../../../lib/chatInbox'
import { useChatAuiSession } from '../aui/ChatAuiRuntime'
import { useChatInboxContext } from './ChatInboxContext'
import { FilterTiles } from './FilterTiles'
import './Inbox.css'
import { GithubBind } from './GithubBind'
import { LocalFolderBind } from './LocalFolderBind'
import { ProjectList } from './ProjectList'
import { ProjectPanel } from './ProjectPanel'
import { WorkspaceList } from './WorkspaceList'

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  queued: 'Queued',
  working: 'Working',
  needs_attention: 'Attention',
  in_review: 'Review',
  done: 'Done',
}

export function InboxShell({ onNavigate }: { onNavigate?: () => void }) {
  const { threads, activeId, busy, startNewChat, selectThread } = useChatAuiSession()
  const {
    state,
    addProject,
    removeProject,
    linkThread,
    addWorkspace,
    removeWorkspace,
    bindWorkspaceRef,
    spawnWorker,
    bindAgentThread,
    updateProjectMemory,
  } = useChatInboxContext()
  const [sandboxBusy, setSandboxBusy] = useState(false)
  const [sandboxNote, setSandboxNote] = useState<string | null>(null)
  const [localBindWorkspaceId, setLocalBindWorkspaceId] = useState<string | null>(null)
  const [githubBindWorkspaceId, setGithubBindWorkspaceId] = useState<string | null>(null)

  const [filter, setFilter] = useState<InboxFilter>('all')
  const [query, setQuery] = useState('')
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [workspacesOpen, setWorkspacesOpen] = useState(true)

  const createAndFocusProject = () => {
    const project = addProject(undefined, activeId || undefined)
    setActiveProjectId(project.id)
    setProjectsOpen(true)
    return project
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

  const spawnWorkerForProject = (projectId: string) => {
    const threadId = startNewChat()
    const worker = spawnWorker(projectId, {
      threadId,
      title: `Worker · ${state.projects.find((p) => p.id === projectId)?.title || 'Project'}`,
    })
    bindAgentThread(worker.id, threadId)
    setActiveProjectId(projectId)
    onNavigate?.()
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

  const filtered = useMemo(() => {
    const base = filterAgentViews(views, filter, activeProjectId)
    return base.filter((v) => matchesSearch(v.title, query))
  }, [activeProjectId, filter, query, views])

  const filteredByThreadId = useMemo(() => {
    const map = new Map<string, ThreadAgentView>()
    for (const v of filtered) {
      if (v.threadId) map.set(v.threadId, v)
    }
    return map
  }, [filtered])

  const orphanAgents = useMemo(
    () =>
      filtered.filter(
        (v) =>
          v.source === 'agent' &&
          v.role !== 'thread' &&
          (!v.threadId || !threads.some((t) => t.id === v.threadId)),
      ),
    [filtered, threads],
  )

  const activeProject = activeProjectId
    ? state.projects.find((p) => p.id === activeProjectId) || null
    : null

  return (
    <div className="inbox-shell">
      <div className="inbox-header">
        <h2 className="inbox-header-title">Inbox</h2>
        <button
          type="button"
          className="inbox-header-new"
          aria-label="New project"
          title="New project"
          onClick={() => {
            createAndFocusProject()
            onNavigate?.()
          }}
        >
          +
        </button>
      </div>

      <label className="inbox-search">
        <span className="aui-sr-only">Search inbox</span>
        <input
          type="search"
          value={query}
          placeholder="Search agents & chats"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <FilterTiles filter={filter} counts={counts} onChange={setFilter} />

      <ProjectList
        projects={state.projects}
        activeProjectId={activeProjectId}
        open={projectsOpen}
        onToggle={() => setProjectsOpen((v) => !v)}
        onSelect={(id) => setActiveProjectId(id)}
        onCreate={() => {
          createAndFocusProject()
        }}
        onDelete={(id) => {
          removeProject(id)
          if (activeProjectId === id) setActiveProjectId(null)
        }}
      />

      {activeProject ? (
        <ProjectPanel
          project={activeProject}
          agents={state.agents}
          onSpawnWorker={() => spawnWorkerForProject(activeProject.id)}
          onOpenAgent={openAgent}
          onMemoryChange={(memory) => updateProjectMemory(activeProject.id, memory)}
        />
      ) : null}

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

      <button
        type="button"
        className="inbox-new-chat"
        onClick={() => {
          startNewChat()
          onNavigate?.()
        }}
      >
        + New chat
      </button>

      <div className="inbox-agents" aria-label="Agents and chats">
        <div className="inbox-agents-label">
          {filter === 'all' ? 'Agents' : STATUS_LABEL[filter] || 'Agents'}
          {activeProjectId ? ' · project' : ''}
        </div>

        <ThreadListPrimitive.Root className="aui-thread-list">
          <ThreadListPrimitive.Items>
            {() => (
              <InboxThreadItem
                filteredByThreadId={filteredByThreadId}
                activeProjectId={activeProjectId}
                onAttach={(threadId) => {
                  if (activeProjectId) linkThread(activeProjectId, threadId)
                }}
                onNavigate={onNavigate}
              />
            )}
          </ThreadListPrimitive.Items>
        </ThreadListPrimitive.Root>

        {filtered.length === 0 ? (
          <p className="inbox-empty">No agents match this filter yet.</p>
        ) : null}

        {orphanAgents.length ? (
          <ul className="inbox-list">
            {orphanAgents.map((v) => {
              const agent = state.agents.find((a) => a.id === v.id)
              return (
                <li key={v.id} className="inbox-list-item">
                  <button
                    type="button"
                    className="inbox-list-btn"
                    onClick={() => {
                      if (agent) openAgent(agent)
                    }}
                  >
                    {v.title}
                  </button>
                  <span className={`inbox-agent-status is-${v.status}`}>
                    {STATUS_LABEL[v.status] || v.status}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

function InboxThreadItem({
  filteredByThreadId,
  activeProjectId,
  onAttach,
  onNavigate,
}: {
  filteredByThreadId: Map<string, ThreadAgentView>
  activeProjectId: string | null
  onAttach: (threadId: string) => void
  onNavigate?: () => void
}) {
  const threadId = useAuiState((s) => s.threadListItem.id)
  const view = filteredByThreadId.get(threadId)
  if (!view) return null

  return (
    <ThreadListItemPrimitive.Root className="aui-thread-item">
      <ThreadListItemPrimitive.Trigger
        className="aui-thread-trigger"
        onClick={() => {
          if (activeProjectId) onAttach(threadId)
          onNavigate?.()
        }}
      >
        <ThreadListItemPrimitive.Title />
      </ThreadListItemPrimitive.Trigger>
      <span className={`inbox-agent-status is-${view.status}`}>
        {STATUS_LABEL[view.status] || view.status}
      </span>
      <ThreadListItemPrimitive.Archive className="aui-thread-archive" title="Archive" />
      <ThreadListItemPrimitive.Delete className="aui-thread-delete" title="Delete" />
    </ThreadListItemPrimitive.Root>
  )
}
