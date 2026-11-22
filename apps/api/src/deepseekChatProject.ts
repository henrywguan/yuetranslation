/**
 * Chat Inbox Project orchestration store (Overseer tools).
 * Server holds a turn-local snapshot; mutations emit actions the client applies
 * (create/resume workers, status → Inbox tiles, memory).
 */

export type ProjectAgentWire = {
  id: string
  title: string
  status: string
  role: 'overseer' | 'worker' | 'thread'
  threadId?: string
}

export type ProjectAction =
  | {
      type: 'create_agent'
      agentId: string
      title: string
      status: string
      message?: string
    }
  | {
      type: 'message_agent'
      agentId: string
      message: string
    }
  | {
      type: 'set_status'
      agentId: string
      status: string
      reviewUrl?: string
    }
  | {
      type: 'update_memory'
      memory: string
    }
  | {
      type: 'compact_agent'
      agentId: string
      summary: string
      archive: boolean
      status: 'done' | 'canceled'
    }

const STATUS_OK = new Set([
  'queued',
  'working',
  'needs_attention',
  'in_review',
  'done',
  'idle',
  'canceled',
])

const CLOSE_STATUS_OK = new Set(['done', 'canceled'])

export type ChatProjectStore = {
  projectId: string
  memory: string
  agents: ProjectAgentWire[]
  pendingActions: ProjectAction[]
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function createProjectStore(opts: {
  projectId?: string
  memory?: string
  agents?: ProjectAgentWire[]
}): ChatProjectStore | undefined {
  const projectId = String(opts.projectId || '').trim()
  if (!projectId) return undefined
  const agents = (opts.agents || [])
    .filter((a) => a && typeof a.id === 'string')
    .map((a) => ({
      id: a.id,
      title: String(a.title || 'Agent').slice(0, 120),
      status: STATUS_OK.has(a.status) ? a.status : 'idle',
      role: a.role === 'overseer' || a.role === 'worker' ? a.role : ('thread' as const),
      threadId: typeof a.threadId === 'string' ? a.threadId : undefined,
    }))
    .slice(0, 80)
  return {
    projectId,
    memory: String(opts.memory || '').slice(0, 8_000),
    agents,
    pendingActions: [],
  }
}

export function projectListJson(store: ChatProjectStore): string {
  return JSON.stringify({
    projectId: store.projectId,
    memoryChars: store.memory.length,
    agents: store.agents.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      role: a.role,
      hasThread: Boolean(a.threadId),
    })),
  })
}

export function projectCreateAgent(
  store: ChatProjectStore,
  title: string,
  message?: string,
):
  | { ok: true; agentId: string; action: Extract<ProjectAction, { type: 'create_agent' }> }
  | { ok: false; error: string } {
  const cleanTitle = String(title || '').trim().slice(0, 120) || 'Worker'
  if (store.agents.filter((a) => a.role === 'worker').length >= 40) {
    return { ok: false, error: 'Too many workers in this Project (max 40).' }
  }
  const agentId = uid('agent')
  const status = message?.trim() ? 'queued' : 'queued'
  const agent: ProjectAgentWire = {
    id: agentId,
    title: cleanTitle,
    status,
    role: 'worker',
  }
  store.agents = [agent, ...store.agents]
  const action: ProjectAction = {
    type: 'create_agent',
    agentId,
    title: cleanTitle,
    status,
    ...(message?.trim() ? { message: message.trim().slice(0, 8_000) } : null),
  }
  store.pendingActions.push(action)
  return { ok: true, agentId, action }
}

export function projectMessageAgent(
  store: ChatProjectStore,
  agentId: string,
  message: string,
):
  | { ok: true; action: Extract<ProjectAction, { type: 'message_agent' }> }
  | { ok: false; error: string } {
  const id = String(agentId || '').trim()
  const msg = String(message || '').trim().slice(0, 8_000)
  if (!id) return { ok: false, error: 'agentId required' }
  if (!msg) return { ok: false, error: 'message required' }
  const agent = store.agents.find((a) => a.id === id)
  if (!agent) return { ok: false, error: 'Agent not found in this Project.' }
  if (agent.role === 'overseer') {
    return { ok: false, error: 'Cannot message the Overseer via tool — reply in this chat.' }
  }
  agent.status = 'queued'
  const action: ProjectAction = { type: 'message_agent', agentId: id, message: msg }
  store.pendingActions.push(action)
  return { ok: true, action }
}

export function projectSetStatus(
  store: ChatProjectStore,
  agentId: string,
  status: string,
  reviewUrl?: string,
):
  | { ok: true; action: Extract<ProjectAction, { type: 'set_status' }> }
  | { ok: false; error: string } {
  const id = String(agentId || '').trim()
  const next = String(status || '').trim()
  if (!id) return { ok: false, error: 'agentId required' }
  if (!STATUS_OK.has(next)) {
    return { ok: false, error: `status must be one of: ${[...STATUS_OK].join(', ')}` }
  }
  const agent = store.agents.find((a) => a.id === id)
  if (!agent) return { ok: false, error: 'Agent not found in this Project.' }
  agent.status = next
  const action: ProjectAction = {
    type: 'set_status',
    agentId: id,
    status: next,
    ...(typeof reviewUrl === 'string' && reviewUrl.trim()
      ? { reviewUrl: reviewUrl.trim().slice(0, 2_000) }
      : null),
  }
  store.pendingActions.push(action)
  return { ok: true, action }
}

export function projectUpdateMemory(
  store: ChatProjectStore,
  memory: string,
): { ok: true; action: Extract<ProjectAction, { type: 'update_memory' }> } {
  store.memory = String(memory || '').slice(0, 8_000)
  const action: ProjectAction = { type: 'update_memory', memory: store.memory }
  store.pendingActions.push(action)
  return { ok: true, action }
}

/**
 * Close a worker: set done/canceled, append a compact summary into Project memory,
 * and emit compact_agent so the client archives the thread + stops sending full history.
 */
export function projectCloseAgent(
  store: ChatProjectStore,
  agentId: string,
  status: string,
  summary: string,
):
  | {
      ok: true
      actions: Array<
        | Extract<ProjectAction, { type: 'set_status' }>
        | Extract<ProjectAction, { type: 'compact_agent' }>
        | Extract<ProjectAction, { type: 'update_memory' }>
      >
    }
  | { ok: false; error: string } {
  const id = String(agentId || '').trim()
  const next = String(status || '')
    .trim()
    .toLowerCase()
  const note = String(summary || '').trim().slice(0, 2_000)
  if (!id) return { ok: false, error: 'agentId required' }
  if (!CLOSE_STATUS_OK.has(next)) {
    return { ok: false, error: "status must be 'done' or 'canceled'" }
  }
  if (!note) return { ok: false, error: 'summary required (compact context for later turns)' }
  const agent = store.agents.find((a) => a.id === id)
  if (!agent) return { ok: false, error: 'Agent not found in this Project.' }
  if (agent.role === 'overseer') {
    return { ok: false, error: 'Cannot close the Overseer — close workers only.' }
  }
  agent.status = next
  const closeStatus = next as 'done' | 'canceled'
  const setAction: Extract<ProjectAction, { type: 'set_status' }> = {
    type: 'set_status',
    agentId: id,
    status: closeStatus,
  }
  const compactAction: Extract<ProjectAction, { type: 'compact_agent' }> = {
    type: 'compact_agent',
    agentId: id,
    summary: note,
    archive: true,
    status: closeStatus,
  }
  const memLine = `[${closeStatus}] ${agent.title}: ${note}`
  const joined = store.memory.trim()
    ? `${store.memory.trim()}\n${memLine}`
    : memLine
  store.memory = joined.slice(-8_000)
  const memAction: Extract<ProjectAction, { type: 'update_memory' }> = {
    type: 'update_memory',
    memory: store.memory,
  }
  const actions = [setAction, compactAction, memAction] as const
  store.pendingActions.push(...actions)
  return { ok: true, actions: [...actions] }
}

export function drainProjectActions(store: ChatProjectStore): ProjectAction[] {
  if (!store.pendingActions.length) return []
  return store.pendingActions.splice(0, store.pendingActions.length)
}
