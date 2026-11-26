/**
 * Cloud Inbox Projects — move / list / upsert for signed-in #/chat.
 * Mirrors translation_history + companion prefs: service-role admin client, RLS on user_id.
 */
import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { requireAuth } from './auth.js'
import { env } from './env.js'
import { allowUserRateOrReject } from './guestRateLimit.js'
import { getAdmin } from './supabase.js'

const MAX_PROJECTS_PER_USER = 40
const MAX_THREADS_PER_PROJECT = 40
const MAX_MESSAGES = 80
const MAX_CONTENT_CHARS = 12_000
const MAX_REASONING_CHARS = 48_000
const KEEP_REASONING_TAIL = 4
const KEEP_SEARCH_STEPS_TAIL = 4
const MAX_MEMORY_CHARS = 8_000
const MAX_AGENTS = 120
const MAX_WORKSPACES = 40
const MAX_THREAD_IDS = 80
/** Soft cap on serialized thread JSON per project (~bytes of JSON text). */
const MAX_THREADS_JSON_CHARS = 6_000_000

const ERR = 'Chat cloud sync unavailable.'

type CloudAgent = {
  id: string
  projectId: string | null
  title: string
  status: string
  role: string
  threadId?: string
  updatedAt: number
  reviewUrl?: string
  compactSummary?: string
  closedAt?: number
}

type CloudWorkspace = {
  id: string
  kind: string
  title: string
  projectId?: string
  createdAt: number
  updatedAt: number
  /** GitHub repo full name or sandbox session id — never a File System Access handle. */
  ref?: string
}

type CloudProjectMeta = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  threadIds: string[]
  defaultWorkspaceId?: string
  overseerAgentId?: string
  memory?: string
}

type CloudThreadMsg = {
  id: string
  role: string
  content: string
  createdAt: number
  reasoning?: string
  thoughtMs?: number
  sources?: unknown[]
  searchSteps?: unknown[]
  fileIds?: string[]
  files?: unknown[]
  alternates?: unknown[]
  activeAlternate?: number
}

type CloudThread = {
  id: string
  title: string
  updatedAt: number
  messages: CloudThreadMsg[]
  pinned?: boolean
  archived?: boolean
  /** Omit heavy harness workspace blobs from cloud — chrome only. */
  workspace?: { files: unknown[]; updatedAt: number }
}

export type CloudProjectPayload = {
  threadIds: string[]
  agents: CloudAgent[]
  workspaces: CloudWorkspace[]
  defaultWorkspaceId?: string
  overseerAgentId?: string
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asNumber(v: unknown, fallback = Date.now()): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function pruneMessage(m: Partial<CloudThreadMsg>): CloudThreadMsg | null {
  const id = asString(m.id).trim()
  const role = m.role === 'assistant' ? 'assistant' : m.role === 'user' ? 'user' : ''
  if (!id || !role) return null
  let content = asString(m.content)
  if (content.length > MAX_CONTENT_CHARS) {
    content = `${content.slice(0, MAX_CONTENT_CHARS)}\n\n…`
  }
  const row: CloudThreadMsg = {
    id,
    role,
    content,
    createdAt: asNumber(m.createdAt),
  }
  if (typeof m.reasoning === 'string' && m.reasoning) {
    row.reasoning =
      m.reasoning.length > MAX_REASONING_CHARS
        ? `…\n${m.reasoning.slice(-MAX_REASONING_CHARS)}`
        : m.reasoning
  }
  if (typeof m.thoughtMs === 'number' && Number.isFinite(m.thoughtMs)) row.thoughtMs = m.thoughtMs
  if (Array.isArray(m.sources) && m.sources.length) row.sources = m.sources.slice(0, 24)
  if (Array.isArray(m.searchSteps) && m.searchSteps.length) {
    row.searchSteps = m.searchSteps.slice(0, 40)
  }
  if (Array.isArray(m.fileIds) && m.fileIds.length) {
    row.fileIds = m.fileIds.filter((x): x is string => typeof x === 'string').slice(0, 8)
  }
  if (Array.isArray(m.files) && m.files.length) row.files = m.files.slice(0, 8)
  if (Array.isArray(m.alternates) && m.alternates.length) row.alternates = m.alternates.slice(-2)
  if (typeof m.activeAlternate === 'number') row.activeAlternate = m.activeAlternate
  return row
}

/** Mirror client pruneChatThreads — cap messages / trim old reasoning & searchSteps. */
export function sanitizeCloudThread(raw: unknown): CloudThread | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = asString(o.id).trim()
  if (!id) return null
  const messagesIn = Array.isArray(o.messages) ? o.messages : []
  const messages = messagesIn
    .map((m) => pruneMessage((m || {}) as Partial<CloudThreadMsg>))
    .filter((m): m is CloudThreadMsg => Boolean(m))
    .slice(-MAX_MESSAGES)

  const keepReasoning = new Set<string>()
  const keepSearchSteps = new Set<string>()
  let assistantsFromEnd = 0
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i]!
    if (m.role !== 'assistant') continue
    if (assistantsFromEnd < KEEP_REASONING_TAIL && m.reasoning) keepReasoning.add(m.id)
    if (assistantsFromEnd < KEEP_SEARCH_STEPS_TAIL && m.searchSteps?.length) {
      keepSearchSteps.add(m.id)
    }
    assistantsFromEnd += 1
  }

  const slimmed = messages.map((m) => {
    let row = m
    if (m.reasoning && !keepReasoning.has(m.id)) {
      const { reasoning: _r, ...rest } = row
      row = rest
    }
    if (row.searchSteps?.length && !keepSearchSteps.has(row.id)) {
      const { searchSteps: _s, ...rest } = row
      row = rest
    }
    return row
  })

  return {
    id,
    title: asString(o.title, 'New chat').trim().slice(0, 120) || 'New chat',
    updatedAt: asNumber(o.updatedAt),
    messages: slimmed,
    pinned: Boolean(o.pinned) || undefined,
    archived: Boolean(o.archived) || undefined,
    // Drop harness file blobs — device-local only. Keep empty shell if present.
    workspace: undefined,
  }
}

function sanitizeAgent(raw: unknown, projectId: string): CloudAgent | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = asString(o.id).trim()
  if (!id) return null
  const role =
    o.role === 'overseer' || o.role === 'worker' || o.role === 'thread' ? o.role : 'thread'
  return {
    id,
    projectId: typeof o.projectId === 'string' ? o.projectId : projectId,
    title: asString(o.title, 'Agent').trim().slice(0, 120) || 'Agent',
    status: asString(o.status, 'idle').slice(0, 32) || 'idle',
    role,
    threadId: typeof o.threadId === 'string' ? o.threadId : undefined,
    updatedAt: asNumber(o.updatedAt),
    reviewUrl: typeof o.reviewUrl === 'string' ? o.reviewUrl.slice(0, 2_000) : undefined,
    compactSummary:
      typeof o.compactSummary === 'string' ? o.compactSummary.slice(0, 2_000) : undefined,
    closedAt: typeof o.closedAt === 'number' ? o.closedAt : undefined,
  }
}

function sanitizeWorkspace(raw: unknown, projectId: string): CloudWorkspace | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = asString(o.id).trim()
  if (!id) return null
  const kind =
    o.kind === 'internal' || o.kind === 'local' || o.kind === 'github' || o.kind === 'files'
      ? o.kind
      : 'internal'
  // Never sync File System Access directory handles — only string refs (github / sandbox id).
  const ref =
    kind === 'local'
      ? undefined
      : typeof o.ref === 'string'
        ? o.ref.slice(0, 500)
        : undefined
  return {
    id,
    kind,
    title: asString(o.title, 'Workspace').trim().slice(0, 120) || 'Workspace',
    projectId: typeof o.projectId === 'string' ? o.projectId : projectId,
    createdAt: asNumber(o.createdAt),
    updatedAt: asNumber(o.updatedAt),
    ref,
  }
}

export function sanitizeMoveBody(
  projectId: string,
  body: unknown,
): {
  project: CloudProjectMeta
  payload: CloudProjectPayload
  threads: CloudThread[]
} | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Missing body.' }
  const b = body as Record<string, unknown>
  const rawProject = (b.project && typeof b.project === 'object' ? b.project : b) as Record<
    string,
    unknown
  >
  const id = asString(rawProject.id || projectId).trim()
  if (!id || id !== projectId) return { error: 'Project id mismatch.' }

  const threadIds = Array.isArray(rawProject.threadIds)
    ? rawProject.threadIds.filter((x): x is string => typeof x === 'string').slice(0, MAX_THREAD_IDS)
    : []

  const agentsIn = Array.isArray(b.agents) ? b.agents : []
  const agents = agentsIn
    .map((a) => sanitizeAgent(a, id))
    .filter((a): a is CloudAgent => Boolean(a))
    .filter((a) => a.projectId === id || a.projectId === null)
    .slice(0, MAX_AGENTS)

  const workspacesIn = Array.isArray(b.workspaces) ? b.workspaces : []
  const workspaces = workspacesIn
    .map((w) => sanitizeWorkspace(w, id))
    .filter((w): w is CloudWorkspace => Boolean(w))
    .filter((w) => w.projectId === id)
    .slice(0, MAX_WORKSPACES)

  const threadsIn = Array.isArray(b.threads) ? b.threads : []
  const threads: CloudThread[] = []
  let jsonBudget = MAX_THREADS_JSON_CHARS
  for (const raw of threadsIn.slice(0, MAX_THREADS_PER_PROJECT)) {
    const t = sanitizeCloudThread(raw)
    if (!t) continue
    const encoded = JSON.stringify(t)
    if (encoded.length > jsonBudget) {
      // Keep a stub so the link survives; drop message bodies.
      threads.push({
        id: t.id,
        title: t.title,
        updatedAt: t.updatedAt,
        messages: [],
        pinned: t.pinned,
        archived: t.archived,
      })
      continue
    }
    jsonBudget -= encoded.length
    threads.push(t)
  }

  // Ensure threadIds covers uploaded threads + any ids still linked locally.
  const idSet = new Set(threadIds)
  for (const t of threads) idSet.add(t.id)
  const mergedIds = [...idSet].slice(0, MAX_THREAD_IDS)

  const memory =
    typeof rawProject.memory === 'string'
      ? rawProject.memory.slice(0, MAX_MEMORY_CHARS)
      : undefined

  const project: CloudProjectMeta = {
    id,
    title: asString(rawProject.title, 'Untitled project').trim().slice(0, 120) || 'Untitled project',
    createdAt: asNumber(rawProject.createdAt),
    updatedAt: asNumber(rawProject.updatedAt),
    threadIds: mergedIds,
    defaultWorkspaceId:
      typeof rawProject.defaultWorkspaceId === 'string'
        ? rawProject.defaultWorkspaceId
        : undefined,
    overseerAgentId:
      typeof rawProject.overseerAgentId === 'string' ? rawProject.overseerAgentId : undefined,
    memory,
  }

  return {
    project,
    payload: {
      threadIds: mergedIds,
      agents,
      workspaces,
      defaultWorkspaceId: project.defaultWorkspaceId,
      overseerAgentId: project.overseerAgentId,
    },
    threads,
  }
}

async function countUserProjects(userId: string): Promise<number> {
  const admin = getAdmin()
  if (!admin) return 0
  const { count, error } = await admin
    .from('chat_cloud_projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) return 0
  return count ?? 0
}

/**
 * POST /api/chat/cloud/projects/:id/move — upsert project + threads snapshot.
 * Idempotent: repeat moves overwrite (last-write-wins on updated_at).
 */
export async function postChatCloudProjectMove(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return
  if (!allowUserRateOrReject(res, auth.userId, 'chatCloudMove', env.chatRlPerMin)) return

  const projectId = String(req.params.id || '').trim()
  if (!projectId) {
    res.status(400).json({ message: 'Project id required.' })
    return
  }

  const parsed = sanitizeMoveBody(projectId, req.body)
  if ('error' in parsed) {
    res.status(400).json({ message: parsed.error })
    return
  }
  const { project, payload, threads } = parsed
  const syncedAt = Date.now()
  const updatedIso = new Date(Math.max(project.updatedAt, syncedAt)).toISOString()
  const createdIso = new Date(project.createdAt).toISOString()

  if (env.openMode) {
    res.json({
      ok: true,
      cloudId: project.id,
      cloudSyncedAt: syncedAt,
      threadCount: threads.length,
      project: { ...project, cloudId: project.id, cloudSyncedAt: syncedAt },
    })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: ERR })
    return
  }

  // Cap new projects per user (upsert of existing is always allowed).
  const { data: existing } = await admin
    .from('chat_cloud_projects')
    .select('id')
    .eq('user_id', auth.userId)
    .eq('id', project.id)
    .maybeSingle()

  if (!existing) {
    const n = await countUserProjects(auth.userId)
    if (n >= MAX_PROJECTS_PER_USER) {
      res.status(400).json({
        message: `Cloud project limit reached (${MAX_PROJECTS_PER_USER}). Delete one first.`,
      })
      return
    }
  }

  const { error: projErr } = await admin.from('chat_cloud_projects').upsert(
    {
      id: project.id,
      user_id: auth.userId,
      title: project.title,
      memory: project.memory ?? null,
      payload,
      created_at: createdIso,
      updated_at: updatedIso,
    },
    { onConflict: 'user_id,id' },
  )
  if (projErr) {
    console.warn('[chat-cloud] project upsert failed', projErr.message)
    res.status(500).json({ message: ERR })
    return
  }

  // Replace thread set for this project: upsert uploaded, delete orphans no longer linked.
  if (threads.length) {
    const rows = threads.map((t) => ({
      id: t.id,
      user_id: auth.userId,
      project_id: project.id,
      thread: t,
      updated_at: new Date(Math.max(t.updatedAt, syncedAt)).toISOString(),
    }))
    const { error: thrErr } = await admin.from('chat_cloud_threads').upsert(rows, {
      onConflict: 'user_id,id',
    })
    if (thrErr) {
      console.warn('[chat-cloud] threads upsert failed', thrErr.message)
      res.status(500).json({ message: ERR })
      return
    }
  }

  const keepIds = project.threadIds
  const { data: existingThreads } = await admin
    .from('chat_cloud_threads')
    .select('id')
    .eq('user_id', auth.userId)
    .eq('project_id', project.id)

  const toDelete = (existingThreads || [])
    .map((r: { id: string }) => r.id)
    .filter((id: string) => !keepIds.includes(id))
  if (toDelete.length) {
    const { error: delErr } = await admin
      .from('chat_cloud_threads')
      .delete()
      .eq('user_id', auth.userId)
      .eq('project_id', project.id)
      .in('id', toDelete)
    if (delErr) {
      console.warn('[chat-cloud] thread prune failed', delErr.message)
    }
  }

  res.json({
    ok: true,
    cloudId: project.id,
    cloudSyncedAt: syncedAt,
    threadCount: threads.length,
    project: { ...project, cloudId: project.id, cloudSyncedAt: syncedAt },
  })
}

/**
 * GET /api/chat/cloud/projects — list cloud projects + thread blobs for hydrate.
 */
export async function getChatCloudProjects(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return
  if (!allowUserRateOrReject(res, auth.userId, 'chatCloudList', env.chatRlPerMin)) return

  if (env.openMode) {
    res.json({ projects: [] })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: ERR })
    return
  }

  const { data: projRows, error: projErr } = await admin
    .from('chat_cloud_projects')
    .select('id, title, memory, payload, created_at, updated_at')
    .eq('user_id', auth.userId)
    .order('updated_at', { ascending: false })
    .limit(MAX_PROJECTS_PER_USER)

  if (projErr) {
    console.warn('[chat-cloud] list projects failed', projErr.message)
    res.status(500).json({ message: ERR })
    return
  }

  const projects = projRows || []
  if (!projects.length) {
    res.json({ projects: [] })
    return
  }

  const projectIds = projects.map((p: { id: string }) => p.id)
  const { data: thrRows, error: thrErr } = await admin
    .from('chat_cloud_threads')
    .select('id, project_id, thread, updated_at')
    .eq('user_id', auth.userId)
    .in('project_id', projectIds)

  if (thrErr) {
    console.warn('[chat-cloud] list threads failed', thrErr.message)
    res.status(500).json({ message: ERR })
    return
  }

  const threadsByProject = new Map<string, CloudThread[]>()
  for (const row of thrRows || []) {
    const t = sanitizeCloudThread(row.thread)
    if (!t) continue
    // Prefer row updated_at when newer.
    const rowAt = row.updated_at ? Date.parse(String(row.updated_at)) : NaN
    if (Number.isFinite(rowAt) && rowAt > t.updatedAt) t.updatedAt = rowAt
    const list = threadsByProject.get(row.project_id) || []
    list.push(t)
    threadsByProject.set(row.project_id, list)
  }

  const out = projects.map(
    (p: {
      id: string
      title: string
      memory: string | null
      payload: CloudProjectPayload | null
      created_at: string
      updated_at: string
    }) => {
      const payload =
        p.payload && typeof p.payload === 'object'
          ? p.payload
          : ({ threadIds: [], agents: [], workspaces: [] } as CloudProjectPayload)
      const updatedAt = Date.parse(p.updated_at) || Date.now()
      const createdAt = Date.parse(p.created_at) || updatedAt
      const threads = (threadsByProject.get(p.id) || []).slice(0, MAX_THREADS_PER_PROJECT)
      return {
        id: p.id,
        title: p.title,
        memory: p.memory || undefined,
        createdAt,
        updatedAt,
        cloudId: p.id,
        cloudSyncedAt: updatedAt,
        threadIds: Array.isArray(payload.threadIds) ? payload.threadIds : threads.map((t) => t.id),
        defaultWorkspaceId: payload.defaultWorkspaceId,
        overseerAgentId: payload.overseerAgentId,
        agents: Array.isArray(payload.agents) ? payload.agents : [],
        workspaces: Array.isArray(payload.workspaces) ? payload.workspaces : [],
        threads,
      }
    },
  )

  res.json({ projects: out })
}
