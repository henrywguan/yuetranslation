/**
 * Move Inbox Projects to cloud + hydrate / debounced ongoing sync.
 * Mirrors companion prefs cloud sync debounce (`chatDeepAvatarCloudSync.ts`).
 *
 * API client is lazy-imported so offline smokes can exercise pure helpers
 * without Vite `import.meta.env`.
 */
import {
  CHAT_INBOX_CHANGED_EVENT,
  isCloudBackedProject,
  loadChatInbox,
  markProjectCloudSynced,
  mergeCloudProjectsIntoInbox,
  saveChatInbox,
  type ChatInboxAgent,
  type ChatInboxProject,
  type ChatInboxState,
  type ChatInboxWorkspace,
} from './chatInbox'
import {
  CHAT_THREADS_CHANGED_EVENT,
  pruneChatThreads,
  readChatThreads,
  upsertChatThread,
  writeChatThreads,
  type ChatThread,
} from './chatHistory'

export type ChatCloudProjectHydrate = {
  id: string
  title: string
  memory?: string
  createdAt: number
  updatedAt: number
  cloudId: string
  cloudSyncedAt: number
  threadIds: string[]
  defaultWorkspaceId?: string
  overseerAgentId?: string
  agents?: unknown[]
  workspaces?: unknown[]
  threads?: unknown[]
}

/** Dispatched after cloud hydrate merges threads into local history. */
export const CHAT_CLOUD_HYDRATE_EVENT = 'yue-chat-cloud-hydrate'

const PUSH_DEBOUNCE_MS = 900

let pushTimers = new Map<string, number>()
let hydrateStarted = false
let listenersStarted = false
let pushing = new Set<string>()
/** Skip debounced push while a hydrate merge is writing local IDB. */
let suppressPushUntil = 0

function online(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

/** Collect project-scoped agents + workspaces + pruned threads for upload. */
export function buildCloudProjectSnapshot(
  state: ChatInboxState,
  projectId: string,
  threads: ChatThread[] = readChatThreads(),
): {
  project: ChatInboxProject
  agents: ChatInboxAgent[]
  workspaces: ChatInboxWorkspace[]
  threads: ChatThread[]
} | null {
  const project = state.projects.find((p) => p.id === projectId)
  if (!project) return null
  const agents = state.agents.filter((a) => a.projectId === projectId)
  const workspaces = state.workspaces
    .filter((w) => w.projectId === projectId)
    .map((w) =>
      w.kind === 'local'
        ? { ...w, ref: undefined } // File System Access handles stay device-local
        : w,
    )
  const idSet = new Set(project.threadIds)
  for (const a of agents) {
    if (a.threadId) idSet.add(a.threadId)
  }
  const linked = threads.filter((t) => idSet.has(t.id))
  const { threads: pruned } = pruneChatThreads(linked)
  return { project, agents, workspaces, threads: pruned }
}

export async function uploadProjectToCloud(
  projectId: string,
  opts?: { state?: ChatInboxState; threads?: ChatThread[] },
): Promise<{
  cloudId: string
  cloudSyncedAt: number
  threadCount: number
  state: ChatInboxState
}> {
  if (!online()) throw new Error('You are offline — connect to move this project to cloud.')
  const state = opts?.state || (await loadChatInbox())
  const snap = buildCloudProjectSnapshot(state, projectId, opts?.threads)
  if (!snap) throw new Error('Project not found.')

  const { moveChatCloudProject } = await import('./api')
  const result = await moveChatCloudProject(projectId, {
    project: {
      id: snap.project.id,
      title: snap.project.title,
      createdAt: snap.project.createdAt,
      updatedAt: snap.project.updatedAt,
      threadIds: snap.project.threadIds,
      defaultWorkspaceId: snap.project.defaultWorkspaceId,
      overseerAgentId: snap.project.overseerAgentId,
      memory: snap.project.memory,
    },
    agents: snap.agents,
    workspaces: snap.workspaces,
    threads: snap.threads,
  })

  const next = markProjectCloudSynced(state, projectId, {
    cloudId: result.cloudId,
    cloudSyncedAt: result.cloudSyncedAt,
  })
  // Avoid an immediate re-upsert from the inbox-changed listener.
  suppressPushUntil = Date.now() + 1_500
  await saveChatInbox(next)
  return {
    cloudId: result.cloudId,
    cloudSyncedAt: result.cloudSyncedAt,
    threadCount: result.threadCount,
    state: next,
  }
}

/** Merge remote threads into local history (prefer newer updatedAt). */
export function mergeCloudThreadsIntoHistory(
  local: ChatThread[],
  remote: ChatThread[],
): { threads: ChatThread[]; changed: boolean } {
  if (!remote.length) return { threads: local, changed: false }
  const map = new Map<string, ChatThread>()
  for (const t of local) map.set(t.id, t)
  let changed = false
  for (const r of remote) {
    const prev = map.get(r.id)
    if (!prev || r.updatedAt >= prev.updatedAt) {
      if (!prev || r.updatedAt !== prev.updatedAt || r.messages.length !== prev.messages.length) {
        changed = true
      }
      map.set(r.id, r)
    }
  }
  const { threads } = pruneChatThreads([...map.values()])
  return { threads, changed: changed || threads.length !== local.length }
}

export async function hydrateChatCloudProjects(): Promise<{
  inbox: ChatInboxState
  threads: ChatThread[]
  importedProjects: number
}> {
  suppressPushUntil = Date.now() + 2_000
  const { fetchChatCloudProjects } = await import('./api')
  const remote = await fetchChatCloudProjects()
  const localInbox = await loadChatInbox()
  const localThreads = readChatThreads()

  if (!remote.length) {
    return { inbox: localInbox, threads: localThreads, importedProjects: 0 }
  }

  const inbox = mergeCloudProjectsIntoInbox(
    localInbox,
    remote as Parameters<typeof mergeCloudProjectsIntoInbox>[1],
  )
  const allRemoteThreads: ChatThread[] = []
  for (const p of remote) {
    if (Array.isArray(p.threads)) allRemoteThreads.push(...(p.threads as ChatThread[]))
  }
  const { threads, changed: threadsChanged } = mergeCloudThreadsIntoHistory(
    localThreads,
    allRemoteThreads,
  )

  await saveChatInbox(inbox)
  if (threadsChanged) writeChatThreads(threads)

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(CHAT_CLOUD_HYDRATE_EVENT, {
          detail: { inbox, threads, projects: remote },
        }),
      )
    } catch {
      /* ignore */
    }
  }

  return { inbox, threads, importedProjects: remote.length }
}

async function pushCloudProjectNow(projectId: string) {
  if (pushing.has(projectId)) return
  if (!online()) return
  pushing.add(projectId)
  try {
    const state = await loadChatInbox()
    const project = state.projects.find((p) => p.id === projectId)
    if (!isCloudBackedProject(project)) return
    await uploadProjectToCloud(projectId, { state })
  } catch {
    /* offline / auth — local cache still works */
  } finally {
    pushing.delete(projectId)
  }
}

export function schedulePushCloudProject(projectId: string) {
  if (typeof window === 'undefined' || !projectId) return
  if (Date.now() < suppressPushUntil) return
  const prev = pushTimers.get(projectId)
  if (prev != null) window.clearTimeout(prev)
  const handle = window.setTimeout(() => {
    pushTimers.delete(projectId)
    void pushCloudProjectNow(projectId)
  }, PUSH_DEBOUNCE_MS)
  pushTimers.set(projectId, handle)
}

function scheduleAllCloudProjects(state: ChatInboxState) {
  for (const p of state.projects) {
    if (isCloudBackedProject(p)) schedulePushCloudProject(p.id)
  }
}

function scheduleCloudProjectsForThreads(threads: ChatThread[]) {
  void loadChatInbox().then((state) => {
    const touched = new Set(threads.map((t) => t.id))
    for (const p of state.projects) {
      if (!isCloudBackedProject(p)) continue
      if (p.threadIds.some((id) => touched.has(id))) schedulePushCloudProject(p.id)
      else if (
        state.agents.some(
          (a) => a.projectId === p.id && a.threadId && touched.has(a.threadId),
        )
      ) {
        schedulePushCloudProject(p.id)
      }
    }
  })
}

function ensureListeners() {
  if (listenersStarted || typeof window === 'undefined') return
  listenersStarted = true
  window.addEventListener(CHAT_INBOX_CHANGED_EVENT, ((e: CustomEvent<ChatInboxState>) => {
    const state = e.detail
    if (state) scheduleAllCloudProjects(state)
  }) as EventListener)
  window.addEventListener(CHAT_THREADS_CHANGED_EVENT, ((e: CustomEvent<ChatThread[]>) => {
    const threads = e.detail
    if (Array.isArray(threads)) scheduleCloudProjectsForThreads(threads)
  }) as EventListener)
}

/**
 * Call once from chat shell when signed in — hydrate then start debounced push.
 */
export function startChatCloudProjectSync() {
  ensureListeners()
  if (hydrateStarted || typeof window === 'undefined') return
  hydrateStarted = true
  void hydrateChatCloudProjects().catch(() => {
    /* guest / offline */
  })
}

/** Test helper — reset module latches between smokes. */
export function resetChatCloudSyncForTests() {
  hydrateStarted = false
  listenersStarted = false
  pushing.clear()
  for (const t of pushTimers.values()) {
    if (typeof window !== 'undefined') window.clearTimeout(t)
  }
  pushTimers = new Map()
}

/** Convenience — upsert a single remote thread into disk without full rewrite races. */
export function upsertHydratedThread(thread: ChatThread) {
  upsertChatThread(thread)
}
