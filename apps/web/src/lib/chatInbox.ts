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
  | 'canceled'
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
  /** Compact summary after project_close_agent — replaces full archived transcript context. */
  compactSummary?: string
  /** When the worker was closed (done/canceled). */
  closedAt?: number
}

/** `files` = promoted Thread files snapshot (device-local IDB). */
export type ChatInboxWorkspaceKind = 'internal' | 'local' | 'github' | 'files'

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
    'canceled',
    'idle',
  ]
  return ok.includes(v as InboxAgentStatus) ? (v as InboxAgentStatus) : 'idle'
}

function asRole(v: unknown): ChatInboxAgentRole {
  if (v === 'overseer' || v === 'worker' || v === 'thread') return v
  return 'thread'
}

function asKind(v: unknown): ChatInboxWorkspaceKind {
  if (v === 'internal' || v === 'local' || v === 'github' || v === 'files') return v
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
      compactSummary:
        typeof a.compactSummary === 'string' ? a.compactSummary.slice(0, 2_000) : undefined,
      closedAt: typeof a.closedAt === 'number' ? a.closedAt : undefined,
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

/**
 * Nest a chat under a Project (Cursor Add to Project).
 * Updates project.threadIds and moves chat-role agents; does not rehome Overseer/worker of another project.
 */
export function linkChatToProject(
  state: ChatInboxState,
  projectId: string,
  threadId: string,
): ChatInboxState {
  if (!state.projects.some((p) => p.id === projectId)) return state
  let next = attachThreadToProject(state, projectId, threadId)
  const now = Date.now()
  next = {
    ...next,
    updatedAt: now,
    agents: next.agents.map((a) => {
      if (a.threadId !== threadId) return a
      if ((a.role === 'overseer' || a.role === 'worker') && a.projectId && a.projectId !== projectId) {
        return a
      }
      if (a.projectId === projectId) return a
      return { ...a, projectId, updatedAt: now }
    }),
  }
  return next
}

/** Remove a chat from every Project folder (Cursor Remove from Project). */
export function detachThreadFromProject(
  state: ChatInboxState,
  threadId: string,
): ChatInboxState {
  const now = Date.now()
  const projects = state.projects.map((p) => {
    if (!p.threadIds.includes(threadId)) return p
    return {
      ...p,
      threadIds: p.threadIds.filter((id) => id !== threadId),
      updatedAt: now,
    }
  })
  const agents = state.agents.map((a) => {
    if (a.threadId !== threadId) return a
    // Overseer / workers stay project-owned; only chat threads unlink.
    if (a.role !== 'thread') return a
    if (!a.projectId) return a
    return { ...a, projectId: null, updatedAt: now }
  })
  return { ...state, projects, agents, updatedAt: now }
}

/** Compact status chip labels (dot + short word). */
export const STATUS_CHIP_LABEL: Record<InboxAgentStatus, string> = {
  idle: 'Idle',
  queued: 'Queue',
  working: 'Work',
  needs_attention: 'You',
  in_review: 'Review',
  done: 'Done',
  canceled: 'Cancel',
}

export function statusChipLabel(status: InboxAgentStatus | string): string {
  return STATUS_CHIP_LABEL[status as InboxAgentStatus] || String(status)
}

export function isIdleStatus(status: InboxAgentStatus | string): boolean {
  return status === 'idle'
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
    files: 'Thread files',
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

/**
 * GitHub workspace for `@diff:…` — scoped to the active Project only.
 * Prefer `defaultWorkspaceId` when it is a bound GitHub workspace; else a
 * workspace with `projectId` match. Never falls back to unrelated inbox repos.
 */
export function resolveProjectGithubWorkspace(
  state: ChatInboxState,
  projectId?: string | null,
): ChatInboxWorkspace | undefined {
  if (!projectId) return undefined
  const project = state.projects.find((p) => p.id === projectId)
  if (!project) return undefined
  if (project.defaultWorkspaceId) {
    const def = state.workspaces.find((w) => w.id === project.defaultWorkspaceId)
    if (def?.kind === 'github' && def.ref?.trim()) return def
  }
  return state.workspaces.find(
    (w) => w.projectId === projectId && w.kind === 'github' && Boolean(w.ref?.trim()),
  )
}

export function setAgentStatus(
  state: ChatInboxState,
  agentId: string,
  status: InboxAgentStatus,
  reviewUrl?: string,
): ChatInboxState {
  const now = Date.now()
  const closing = status === 'done' || status === 'canceled'
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
            ...(closing && !a.closedAt ? { closedAt: now } : null),
          }
        : a,
    ),
  }
}

/** Persist Overseer close summary on the agent (Tasks + later wire compaction). */
export function setAgentCompactSummary(
  state: ChatInboxState,
  agentId: string,
  summary: string,
  status?: 'done' | 'canceled',
): ChatInboxState {
  const now = Date.now()
  const note = String(summary || '').trim().slice(0, 2_000)
  return {
    ...state,
    updatedAt: now,
    agents: state.agents.map((a) =>
      a.id === agentId
        ? {
            ...a,
            compactSummary: note || a.compactSummary,
            closedAt: now,
            updatedAt: now,
            ...(status ? { status } : null),
          }
        : a,
    ),
  }
}

/** Build a Workers (compact) block from closed agents for Overseer context. */
export function buildWorkersCompactBlock(
  state: ChatInboxState,
  projectId: string,
): string {
  const closed = state.agents.filter(
    (a) =>
      a.projectId === projectId &&
      a.role === 'worker' &&
      (a.status === 'done' || a.status === 'canceled') &&
      a.compactSummary?.trim(),
  )
  if (!closed.length) return ''
  const lines = closed
    .slice(0, 24)
    .map((a) => `- [${a.status}] ${a.title}: ${a.compactSummary!.trim()}`)
  return `Workers (compact):\n${lines.join('\n')}`
}

/** Merge Project memory with compact worker summaries for the API prompt. */
export function mergeProjectMemoryWithCompacts(
  state: ChatInboxState,
  projectId: string,
  memory?: string,
): string | undefined {
  const base = String(memory || '').trim()
  const block = buildWorkersCompactBlock(state, projectId)
  if (!base && !block) return undefined
  if (!block) return base.slice(0, 8_000)
  if (!base) return block.slice(0, 8_000)
  // Avoid duplicating lines already appended by project_close_agent into memory.
  if (base.includes('Workers (compact):') || closedSummariesAlreadyInMemory(base, block)) {
    return base.slice(0, 8_000)
  }
  return `${base}\n\n${block}`.slice(0, 8_000)
}

function closedSummariesAlreadyInMemory(memory: string, block: string): boolean {
  const first = block
    .split('\n')
    .find((l) => l.startsWith('- ['))
  if (!first) return false
  const snippet = first.replace(/^- \[[^\]]+\]\s*/, '').slice(0, 40)
  return snippet.length > 8 && memory.includes(snippet)
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
  opts?: { id?: string; title?: string; threadId?: string; status?: InboxAgentStatus },
): { state: ChatInboxState; worker: ChatInboxAgent } {
  const project = state.projects.find((p) => p.id === projectId)
  if (!project) {
    throw new Error('Project not found')
  }
  const requestedId = opts?.id?.trim()
  if (requestedId) {
    const existing = state.agents.find((a) => a.id === requestedId)
    if (existing) return { state, worker: existing }
  }
  const now = Date.now()
  const worker: ChatInboxAgent = {
    id: requestedId || uid('agent'),
    projectId,
    title: (opts?.title || `Worker · ${project.title}`).trim(),
    status: opts?.status || 'queued',
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

/** Threads / agents with no Project — Cursor-style top-level chats. */
export function ungroupedAgentViews(views: ThreadAgentView[]): ThreadAgentView[] {
  return views.filter((v) => !v.projectId)
}

const ROLE_ORDER: Record<ChatInboxAgentRole, number> = {
  overseer: 0,
  worker: 1,
  thread: 2,
}

/** Project-owned views nested under a Project folder (Overseer → workers → chats). */
export function projectNestedViews(
  views: ThreadAgentView[],
  projectId: string,
): ThreadAgentView[] {
  return views
    .filter((v) => v.projectId === projectId)
    .slice()
    .sort((a, b) => {
      const roleDiff = (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
      if (roleDiff !== 0) return roleDiff
      return a.title.localeCompare(b.title)
    })
}

export function matchesSearch(title: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return title.toLowerCase().includes(q)
}

/**
 * Overseer replied with "I'll set up workers…" without project_* tool follow-through.
 * Keep in sync with apps/api `looksLikeDeferredOrchestration`.
 */
export function looksLikeDeferredOrchestration(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || t.length > 600) return false
  if ((t.match(/\n/g) || []).length >= 4) return false
  return (
    /\b(i(?:['’]ll| will)|let me|i am going to|i'm going to|i(?:['’]m| am) about to)\b[\s\S]{0,120}\b(set up|create|spawn|spin up|launch|start|stand up|orchestrat(?:e|ing)?|build)\b[\s\S]{0,120}\b(workers?|agents?|knowledge[- ]?base|project)\b/i.test(
      t,
    ) ||
    /\b(then|next|after that)\b[\s\S]{0,80}\b(set up|create|spawn|spin up|launch|start)\b[\s\S]{0,100}\b(workers?|agents?)\b/i.test(
      t,
    ) ||
    /\b(project_create_agent|project_message_agent)\b/i.test(t)
  )
}

export const ORCHESTRATION_STALL_ERROR =
  'Overseer announced worker setup but did not create or message any agents. Say “continue” or rephrase so it calls project tools — Inbox ATTENTION with no workers means orchestration stalled.'

/**
 * Overseer said it would close/archive workers without project_close_agent.
 * Keep in sync with apps/api `looksLikeDeferredClose`.
 */
export function looksLikeDeferredClose(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || t.length > 600) return false
  if ((t.match(/\n/g) || []).length >= 4) return false
  return (
    /\b(i(?:['’]ll| will)|let me|i am going to|i'm going to|i(?:['’]m| am) about to)\b[\s\S]{0,120}\b(close|archive|compact|retire|dismiss|shut down|wrap up)\b[\s\S]{0,120}\b(workers?|agents?|threads?)\b/i.test(
      t,
    ) || /\b(project_close_agent)\b/i.test(t)
  )
}

export const CLOSE_STALL_ERROR =
  'Overseer announced closing workers but did not call project_close_agent. Say “continue” so it closes finished workers with a summary — otherwise Tasks keep stale Working rows.'
