/**
 * Chat Inbox · Projects · Workspaces · agent status (Phase A chrome).
 * IndexedDB preferred; localStorage fallback when IDB unavailable.
 * Overseer spawn / sandboxes / GitHub land in Phases B–E — types are forward-compatible.
 */

export type InboxAgentStatus =
  | 'queued'
  | 'working'
  | 'needs_attention'
  | 'in_review'
  | 'done'
  | 'idle'

export type InboxFilter = 'all' | 'needs_attention' | 'working' | 'in_review'

export type ChatInboxProject = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  /** Classic DeepSeek thread ids grouped under this Project. */
  threadIds: string[]
  defaultWorkspaceId?: string
  /** Overseer agent id (Phase B fills runtime). */
  overseerAgentId?: string
  /** Shared notes the Overseer / workers see each turn (Phase B). */
  memory?: string
}

export type ChatInboxAgentRole = 'overseer' | 'worker' | 'thread'

export type ChatInboxAgent = {
  id: string
  projectId: string | null
  title: string
  status: InboxAgentStatus
  role: ChatInboxAgentRole
  /** Linked DeepSeek thread when the agent is chat-backed. */
  threadId?: string
  updatedAt: number
  /** Optional PR / review URL (Phase E). */
  reviewUrl?: string
}

export type ChatInboxWorkspaceKind = 'internal' | 'local' | 'github'

export type ChatInboxWorkspace = {
  id: string
  kind: ChatInboxWorkspaceKind
  title: string
  projectId?: string
  createdAt: number
  updatedAt: number
  /** Phase C+ session id / Phase D handle key / Phase E repo full name. */
  ref?: string
}

export type ChatInboxState = {
  projects: ChatInboxProject[]
  agents: ChatInboxAgent[]
  workspaces: ChatInboxWorkspace[]
  updatedAt: number
}

export const CHAT_INBOX_DB = 'yue-chat-inbox-v1'
export const CHAT_INBOX_STORE = 'inbox'
export const CHAT_INBOX_KEY = 'state'
export const CHAT_INBOX_LS_KEY = 'yue-chat-inbox-v1'

const MAX_PROJECTS = 40
const MAX_AGENTS = 120
const MAX_WORKSPACES = 40

function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}_${crypto.randomUUID()}`
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function emptyInboxState(): ChatInboxState {
  return { projects: [], agents: [], workspaces: [], updatedAt: Date.now() }
}

function asStatus(v: unknown): InboxAgentStatus {
  const ok: InboxAgentStatus[] = [
    'queued',
    'working',
    'needs_attention',
    'in_review',
    'done',
    'idle',
  ]
  return ok.includes(v as InboxAgentStatus) ? (v as InboxAgentStatus) : 'idle'
}

function asRole(v: unknown): ChatInboxAgentRole {
  if (v === 'overseer' || v === 'worker' || v === 'thread') return v
  return 'thread'
}

function asKind(v: unknown): ChatInboxWorkspaceKind {
  if (v === 'internal' || v === 'local' || v === 'github') return v
  return 'internal'
}

export function normalizeInboxState(raw: unknown): ChatInboxState {
  if (!raw || typeof raw !== 'object') return emptyInboxState()
  const o = raw as Record<string, unknown>
  const projectsIn = Array.isArray(o.projects) ? o.projects : []
  const agentsIn = Array.isArray(o.agents) ? o.agents : []
  const workspacesIn = Array.isArray(o.workspaces) ? o.workspaces : []

  const projects: ChatInboxProject[] = projectsIn
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .slice(0, MAX_PROJECTS)
    .map((p) => ({
      id: typeof p.id === 'string' ? p.id : uid('proj'),
      title: typeof p.title === 'string' && p.title.trim() ? p.title.trim() : 'Untitled project',
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
      updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
      threadIds: Array.isArray(p.threadIds)
        ? p.threadIds.filter((id): id is string => typeof id === 'string').slice(0, 80)
        : [],
      defaultWorkspaceId:
        typeof p.defaultWorkspaceId === 'string' ? p.defaultWorkspaceId : undefined,
      overseerAgentId: typeof p.overseerAgentId === 'string' ? p.overseerAgentId : undefined,
      memory:
        typeof p.memory === 'string' ? p.memory.slice(0, 8_000) : undefined,
    }))

  const agents: ChatInboxAgent[] = agentsIn
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
    .slice(0, MAX_AGENTS)
    .map((a) => ({
      id: typeof a.id === 'string' ? a.id : uid('agent'),
      projectId: typeof a.projectId === 'string' ? a.projectId : null,
      title: typeof a.title === 'string' && a.title.trim() ? a.title.trim() : 'Agent',
      status: asStatus(a.status),
      role: asRole(a.role),
      threadId: typeof a.threadId === 'string' ? a.threadId : undefined,
      updatedAt: typeof a.updatedAt === 'number' ? a.updatedAt : Date.now(),
      reviewUrl: typeof a.reviewUrl === 'string' ? a.reviewUrl : undefined,
    }))

  const workspaces: ChatInboxWorkspace[] = workspacesIn
    .filter((w): w is Record<string, unknown> => !!w && typeof w === 'object')
    .slice(0, MAX_WORKSPACES)
    .map((w) => ({
      id: typeof w.id === 'string' ? w.id : uid('ws'),
      kind: asKind(w.kind),
      title: typeof w.title === 'string' && w.title.trim() ? w.title.trim() : 'Workspace',
      projectId: typeof w.projectId === 'string' ? w.projectId : undefined,
      createdAt: typeof w.createdAt === 'number' ? w.createdAt : Date.now(),
      updatedAt: typeof w.updatedAt === 'number' ? w.updatedAt : Date.now(),
      ref: typeof w.ref === 'string' ? w.ref : undefined,
    }))

  return {
    projects,
    agents,
    workspaces,
    updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : Date.now(),
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'))
      return
    }
    const req = indexedDB.open(CHAT_INBOX_DB, 1)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(CHAT_INBOX_STORE)) {
        db.createObjectStore(CHAT_INBOX_STORE)
      }
    }
  })
}

function readLocalFallback(): ChatInboxState {
  try {
    if (typeof localStorage === 'undefined') return emptyInboxState()
    const raw = localStorage.getItem(CHAT_INBOX_LS_KEY)
    if (!raw) return emptyInboxState()
    return normalizeInboxState(JSON.parse(raw))
  } catch {
    return emptyInboxState()
  }
}

function writeLocalFallback(state: ChatInboxState): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(CHAT_INBOX_LS_KEY, JSON.stringify(state))
  } catch {
    /* quota / private mode */
  }
}

export async function loadChatInbox(): Promise<ChatInboxState> {
  try {
    const db = await openDb()
    const state = await new Promise<ChatInboxState>((resolve, reject) => {
      const tx = db.transaction(CHAT_INBOX_STORE, 'readonly')
      const req = tx.objectStore(CHAT_INBOX_STORE).get(CHAT_INBOX_KEY)
      req.onerror = () => reject(req.error ?? new Error('inbox read failed'))
      req.onsuccess = () => resolve(normalizeInboxState(req.result))
      tx.oncomplete = () => db.close()
    })
    return state
  } catch {
    return readLocalFallback()
  }
}

export async function saveChatInbox(state: ChatInboxState): Promise<void> {
  const next = normalizeInboxState({ ...state, updatedAt: Date.now() })
  writeLocalFallback(next)
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CHAT_INBOX_STORE, 'readwrite')
      tx.objectStore(CHAT_INBOX_STORE).put(next, CHAT_INBOX_KEY)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error ?? new Error('inbox write failed'))
    })
  } catch {
    /* LS already written */
  }
}

export function createProject(
  state: ChatInboxState,
  title = 'New project',
): { state: ChatInboxState; project: ChatInboxProject; overseer: ChatInboxAgent } {
  const now = Date.now()
  const overseerId = uid('agent')
  const project: ChatInboxProject = {
    id: uid('proj'),
    title: title.trim() || 'New project',
    createdAt: now,
    updatedAt: now,
    threadIds: [],
    overseerAgentId: overseerId,
  }
  const overseer: ChatInboxAgent = {
    id: overseerId,
    projectId: project.id,
    title: `${project.title} · Overseer`,
    status: 'idle',
    role: 'overseer',
    updatedAt: now,
  }
  return {
    project,
    overseer,
    state: {
      ...state,
      projects: [project, ...state.projects].slice(0, MAX_PROJECTS),
      agents: [overseer, ...state.agents].slice(0, MAX_AGENTS),
      updatedAt: now,
    },
  }
}

export function renameProject(
  state: ChatInboxState,
  projectId: string,
  title: string,
): ChatInboxState {
  const nextTitle = title.trim() || 'Untitled project'
  const now = Date.now()
  return {
    ...state,
    updatedAt: now,
    projects: state.projects.map((p) =>
      p.id === projectId ? { ...p, title: nextTitle, updatedAt: now } : p,
    ),
    agents: state.agents.map((a) =>
      a.projectId === projectId && a.role === 'overseer'
        ? { ...a, title: `${nextTitle} · Overseer`, updatedAt: now }
        : a,
    ),
  }
}

export function deleteProject(state: ChatInboxState, projectId: string): ChatInboxState {
  const now = Date.now()
  return {
    ...state,
    updatedAt: now,
    projects: state.projects.filter((p) => p.id !== projectId),
    agents: state.agents.filter((a) => a.projectId !== projectId),
    workspaces: state.workspaces.filter((w) => w.projectId !== projectId),
  }
}

export function attachThreadToProject(
  state: ChatInboxState,
  projectId: string,
  threadId: string,
): ChatInboxState {
  const now = Date.now()
  const projects = state.projects.map((p) => {
    if (p.id !== projectId) {
      return { ...p, threadIds: p.threadIds.filter((id) => id !== threadId) }
    }
    if (p.threadIds.includes(threadId)) return { ...p, updatedAt: now }
    return { ...p, threadIds: [threadId, ...p.threadIds].slice(0, 80), updatedAt: now }
  })
  return { ...state, projects, updatedAt: now }
}

export function createWorkspace(
  state: ChatInboxState,
  kind: ChatInboxWorkspaceKind,
  title?: string,
  projectId?: string,
): { state: ChatInboxState; workspace: ChatInboxWorkspace } {
  const now = Date.now()
  const defaults: Record<ChatInboxWorkspaceKind, string> = {
    internal: 'Internal sandbox',
    local: 'Local folder',
    github: 'GitHub repo',
  }
  const workspace: ChatInboxWorkspace = {
    id: uid('ws'),
    kind,
    title: (title || defaults[kind]).trim(),
    projectId,
    createdAt: now,
    updatedAt: now,
  }
  return {
    workspace,
    state: {
      ...state,
      workspaces: [workspace, ...state.workspaces].slice(0, MAX_WORKSPACES),
      updatedAt: now,
    },
  }
}

export function deleteWorkspace(state: ChatInboxState, workspaceId: string): ChatInboxState {
  const now = Date.now()
  return {
    ...state,
    updatedAt: now,
    workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
    projects: state.projects.map((p) =>
      p.defaultWorkspaceId === workspaceId ? { ...p, defaultWorkspaceId: undefined } : p,
    ),
  }
}

export function setWorkspaceRef(
  state: ChatInboxState,
  workspaceId: string,
  ref: string,
): ChatInboxState {
  const now = Date.now()
  return {
    ...state,
    updatedAt: now,
    workspaces: state.workspaces.map((w) =>
      w.id === workspaceId ? { ...w, ref, updatedAt: now } : w,
    ),
  }
}

export function setProjectDefaultWorkspace(
  state: ChatInboxState,
  projectId: string,
  workspaceId: string,
): ChatInboxState {
  const now = Date.now()
  return {
    ...state,
    updatedAt: now,
    projects: state.projects.map((p) =>
      p.id === projectId ? { ...p, defaultWorkspaceId: workspaceId, updatedAt: now } : p,
    ),
  }
}

/** Prefer project default internal sandbox, else newest internal with a session ref. */
export function resolveActiveSandboxSessionId(
  state: ChatInboxState,
  projectId?: string | null,
): string | undefined {
  if (projectId) {
    const project = state.projects.find((p) => p.id === projectId)
    if (project?.defaultWorkspaceId) {
      const ws = state.workspaces.find((w) => w.id === project.defaultWorkspaceId)
      if (ws?.kind === 'internal' && ws.ref?.startsWith('sbx_')) return ws.ref
    }
  }
  const internal = state.workspaces.find(
    (w) => w.kind === 'internal' && w.ref?.startsWith('sbx_'),
  )
  return internal?.ref
}

export function setAgentStatus(
  state: ChatInboxState,
  agentId: string,
  status: InboxAgentStatus,
  reviewUrl?: string,
): ChatInboxState {
  const now = Date.now()
  return {
    ...state,
    updatedAt: now,
    agents: state.agents.map((a) =>
      a.id === agentId
        ? {
            ...a,
            status,
            updatedAt: now,
            ...(reviewUrl !== undefined ? { reviewUrl } : null),
          }
        : a,
    ),
  }
}

export function markAgentInReview(
  state: ChatInboxState,
  agentId: string,
  reviewUrl: string,
): ChatInboxState {
  return setAgentStatus(state, agentId, 'in_review', reviewUrl)
}

export function setAgentThread(
  state: ChatInboxState,
  agentId: string,
  threadId: string,
): ChatInboxState {
  const now = Date.now()
  const agent = state.agents.find((a) => a.id === agentId)
  let next = {
    ...state,
    updatedAt: now,
    agents: state.agents.map((a) =>
      a.id === agentId ? { ...a, threadId, updatedAt: now } : a,
    ),
  }
  if (agent?.projectId) {
    next = attachThreadToProject(next, agent.projectId, threadId)
  }
  return next
}

export function setProjectMemory(
  state: ChatInboxState,
  projectId: string,
  memory: string,
): ChatInboxState {
  const now = Date.now()
  const trimmed = memory.slice(0, 8_000)
  return {
    ...state,
    updatedAt: now,
    projects: state.projects.map((p) =>
      p.id === projectId ? { ...p, memory: trimmed, updatedAt: now } : p,
    ),
  }
}

export function createWorker(
  state: ChatInboxState,
  projectId: string,
  opts?: { title?: string; threadId?: string },
): { state: ChatInboxState; worker: ChatInboxAgent } {
  const project = state.projects.find((p) => p.id === projectId)
  if (!project) {
    throw new Error('Project not found')
  }
  const now = Date.now()
  const worker: ChatInboxAgent = {
    id: uid('agent'),
    projectId,
    title: (opts?.title || `Worker · ${project.title}`).trim(),
    status: 'queued',
    role: 'worker',
    threadId: opts?.threadId,
    updatedAt: now,
  }
  let next: ChatInboxState = {
    ...state,
    agents: [worker, ...state.agents].slice(0, MAX_AGENTS),
    updatedAt: now,
  }
  if (opts?.threadId) {
    next = attachThreadToProject(next, projectId, opts.threadId)
  }
  return { worker, state: next }
}

export function agentForThread(
  state: ChatInboxState,
  threadId: string,
): ChatInboxAgent | undefined {
  return state.agents.find((a) => a.threadId === threadId)
}

/** Synthetic agents for classic threads not yet linked to a Project agent. */
export type ThreadAgentView = {
  id: string
  title: string
  status: InboxAgentStatus
  threadId: string
  projectId: string | null
  role: ChatInboxAgentRole
  source: 'agent' | 'thread'
}

export function buildAgentViews(opts: {
  agents: ChatInboxAgent[]
  projects?: ChatInboxProject[]
  threads: Array<{ id: string; title: string; archived?: boolean }>
  busy: boolean
  activeId: string
}): ThreadAgentView[] {
  const threadProject = new Map<string, string>()
  for (const p of opts.projects || []) {
    for (const tid of p.threadIds) threadProject.set(tid, p.id)
  }
  const linkedThreadIds = new Set(
    opts.agents.map((a) => a.threadId).filter((id): id is string => Boolean(id)),
  )
  const fromAgents: ThreadAgentView[] = opts.agents.map((a) => {
    let status = a.status
    if (a.threadId && a.threadId === opts.activeId && opts.busy) status = 'working'
    return {
      id: a.id,
      title: a.title,
      status,
      threadId: a.threadId || a.id,
      projectId: a.projectId,
      role: a.role,
      source: 'agent',
    }
  })
  const fromThreads: ThreadAgentView[] = opts.threads
    .filter((t) => !t.archived && !linkedThreadIds.has(t.id))
    .map((t) => ({
      id: `thread:${t.id}`,
      title: t.title || 'New chat',
      status: t.id === opts.activeId && opts.busy ? ('working' as const) : ('idle' as const),
      threadId: t.id,
      projectId: threadProject.get(t.id) || null,
      role: 'thread' as const,
      source: 'thread' as const,
    }))
  return [...fromAgents, ...fromThreads]
}

export function countByFilter(views: ThreadAgentView[]): Record<InboxFilter, number> {
  return {
    all: views.length,
    needs_attention: views.filter((v) => v.status === 'needs_attention').length,
    working: views.filter((v) => v.status === 'working').length,
    in_review: views.filter((v) => v.status === 'in_review').length,
  }
}

export function filterAgentViews(
  views: ThreadAgentView[],
  filter: InboxFilter,
  projectId: string | null,
): ThreadAgentView[] {
  let list = views
  if (projectId) list = list.filter((v) => v.projectId === projectId)
  if (filter === 'all') return list
  return list.filter((v) => v.status === filter)
}

export function matchesSearch(title: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return title.toLowerCase().includes(q)
}
