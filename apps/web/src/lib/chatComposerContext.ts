/**
 * Composer `@` mention suggestions + Plan→Build handoff copy for `#/chat` AUI.
 */
import type { ChatInboxAgent, ChatInboxWorkspace } from './chatInbox'
import type { ChatWorkspace } from './chatWorkspace'

export type ChatMentionKind = 'file' | 'workspace' | 'chat'

export type ChatMentionItem = {
  id: string
  kind: ChatMentionKind
  label: string
  /** Inserted into the composer draft (includes leading @). */
  insert: string
  hint?: string
}

/** Detect trailing `@query` at the caret (simple end-of-draft scan for Phase 2). */
export function detectAtQuery(text: string): { start: number; query: string } | null {
  const s = String(text || '')
  // Match `@…` not preceded by a word char; query is the token after @.
  const m = /(^|[\s([{])@([^\s@]*)$/.exec(s)
  if (!m) return null
  const query = m[2] ?? ''
  const start = s.length - query.length - 1
  return { start, query }
}

export function applyMentionInsert(
  text: string,
  start: number,
  insert: string,
): string {
  const before = String(text || '').slice(0, Math.max(0, start))
  const afterQuery = String(text || '').slice(start)
  // Drop the `@query` token we matched (through end — Phase 2 end-of-draft).
  const rest = afterQuery.replace(/^@[^\s@]*/, '')
  const piece = insert.endsWith(' ') ? insert : `${insert} `
  return `${before}${piece}${rest}`
}

function matchesQuery(label: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return label.toLowerCase().includes(q)
}

/** Build ranked `@` suggestions from workspace files, harness paths, and prior chats. */
export function buildChatMentionItems(opts: {
  workspace?: ChatWorkspace | null
  workspaces?: ChatInboxWorkspace[]
  threads?: Array<{ id: string; title: string; archived?: boolean }>
  agents?: ChatInboxAgent[]
  activeThreadId?: string
  query?: string
  limit?: number
}): ChatMentionItem[] {
  const q = String(opts.query || '')
  const limit = Math.max(1, opts.limit ?? 24)
  const out: ChatMentionItem[] = []

  for (const f of opts.workspace?.files || []) {
    const label = f.path
    if (!matchesQuery(label, q) && !matchesQuery('file', q)) continue
    out.push({
      id: `file:${f.id || f.path}`,
      kind: 'file',
      label,
      insert: `@file:${f.path}`,
      hint: 'Workspace file',
    })
  }

  for (const ws of opts.workspaces || []) {
    const label = ws.title || ws.kind
    const pathHint = ws.ref || ws.kind
    if (!matchesQuery(label, q) && !matchesQuery(pathHint, q) && !matchesQuery(ws.kind, q)) {
      continue
    }
    out.push({
      id: `workspace:${ws.id}`,
      kind: 'workspace',
      label,
      insert: `@workspace:${ws.kind}:${label.replace(/\s+/g, '_')}`,
      hint: ws.ref ? `${ws.kind} · ${ws.ref}` : ws.kind,
    })
  }

  const seenThread = new Set<string>()
  for (const a of opts.agents || []) {
    const tid = a.threadId
    if (!tid || tid === opts.activeThreadId) continue
    if (seenThread.has(tid)) continue
    seenThread.add(tid)
    const label = a.title || 'Agent'
    if (!matchesQuery(label, q) && !matchesQuery('chat', q)) continue
    out.push({
      id: `chat:${tid}`,
      kind: 'chat',
      label,
      insert: `@chat:${tid}`,
      hint: a.role === 'overseer' ? 'Overseer' : a.role === 'worker' ? 'Worker' : 'Chat',
    })
  }

  for (const t of opts.threads || []) {
    if (t.archived || t.id === opts.activeThreadId) continue
    if (seenThread.has(t.id)) continue
    seenThread.add(t.id)
    const label = t.title || 'New chat'
    if (!matchesQuery(label, q) && !matchesQuery('chat', q)) continue
    out.push({
      id: `chat:${t.id}`,
      kind: 'chat',
      label,
      insert: `@chat:${t.id}`,
      hint: 'Prior chat',
    })
  }

  return out.slice(0, limit)
}

/** Plan → Build handoff — Overseer plans first, then workers when inside a Project. */
export function buildPlanBuildPrompt(planMarkdown: string, inProject: boolean): string {
  const plan = String(planMarkdown || '').trim() || '(No plan text yet — ask the user to clarify goals.)'
  if (inProject) {
    return [
      'Build this approved plan.',
      'You are the Project Overseer — clarify only if blocked, then break work into tasks and create/resume workers with project_create_agent / project_message_agent.',
      'Do not ask the user to click Spawn. Prefer Overseer planning before workers.',
      '',
      '## Approved plan',
      '',
      plan,
    ].join('\n')
  }
  return [
    'Build this approved plan.',
    'Implement it thoroughly with the tools available this turn.',
    '',
    '## Approved plan',
    '',
    plan,
  ].join('\n')
}
