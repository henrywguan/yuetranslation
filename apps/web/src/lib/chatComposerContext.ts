/**
 * Composer `@` mention suggestions + Plan→Build handoff copy for `#/chat` AUI.
 */
import type { ChatInboxAgent, ChatInboxWorkspace } from './chatInbox'
import type { ChatRunEntry } from './chatReviewActivity'
import type { ChatWorkspace } from './chatWorkspace'

export type ChatMentionKind = 'file' | 'workspace' | 'chat' | 'diff' | 'run'

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

function formatArgvShort(argv: string[]): string {
  const parts = (argv || []).map((a) => String(a)).filter(Boolean)
  if (!parts.length) return 'last run'
  const joined = parts.join(' ')
  return joined.length > 48 ? `${joined.slice(0, 45)}…` : joined
}

/** Build ranked `@` suggestions from workspace files, harness paths, and prior chats. */
export function buildChatMentionItems(opts: {
  workspace?: ChatWorkspace | null
  workspaces?: ChatInboxWorkspace[]
  threads?: Array<{ id: string; title: string; archived?: boolean }>
  agents?: ChatInboxAgent[]
  activeThreadId?: string
  /** When set, prefer chats/agents nested in this Project. */
  projectId?: string | null
  projectThreadIds?: string[]
  /** GitHub-bound workspace — offer diff vs default branch. */
  githubBound?: boolean
  defaultBranch?: string
  /** Optional last sandbox run for `@run:last`. */
  lastRun?: Pick<ChatRunEntry, 'argv'> | null
  query?: string
  limit?: number
}): ChatMentionItem[] {
  const q = String(opts.query || '')
  const limit = Math.max(1, opts.limit ?? 24)
  const out: ChatMentionItem[] = []
  const projectId = opts.projectId || null
  const projectThreadSet = new Set(opts.projectThreadIds || [])

  // Synthetic targets first when they match — Cursor-like diff / last run.
  if (opts.githubBound) {
    const branch = (opts.defaultBranch || 'main').trim() || 'main'
    const labels = [`diff`, `git`, `diff:${branch}`, branch, 'default branch']
    if (labels.some((l) => matchesQuery(l, q))) {
      out.push({
        id: `diff:vs-${branch}`,
        kind: 'diff',
        label: `Diff vs ${branch}`,
        insert: `@diff:${branch}`,
        hint: 'GitHub · changes vs default branch',
      })
    }
  }

  if (opts.lastRun?.argv?.length) {
    const label = formatArgvShort(opts.lastRun.argv)
    if (matchesQuery(label, q) || matchesQuery('run', q) || matchesQuery('last', q)) {
      out.push({
        id: 'run:last',
        kind: 'run',
        label,
        insert: '@run:last',
        hint: 'Last sandbox run',
      })
    }
  }

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
  const pushChat = (
    tid: string,
    label: string,
    hint: string,
    rank: 'project' | 'other',
  ) => {
    if (!tid || tid === opts.activeThreadId) return
    if (seenThread.has(tid)) return
    if (!matchesQuery(label, q) && !matchesQuery('chat', q) && !matchesQuery('project', q)) {
      return
    }
    seenThread.add(tid)
    out.push({
      id: `chat:${tid}`,
      kind: 'chat',
      label,
      insert: `@chat:${tid}`,
      hint: rank === 'project' ? `Project · ${hint}` : hint,
    })
  }

  // Project-scoped chats first when inside a Project.
  if (projectId) {
    for (const a of opts.agents || []) {
      if (a.projectId !== projectId) continue
      const tid = a.threadId
      if (!tid) continue
      const label = a.title || 'Agent'
      const hint =
        a.role === 'overseer' ? 'Overseer' : a.role === 'worker' ? 'Worker' : 'Chat'
      pushChat(tid, label, hint, 'project')
    }
    for (const tid of projectThreadSet) {
      const t = opts.threads?.find((x) => x.id === tid)
      if (!t || t.archived) continue
      pushChat(tid, t.title || 'New chat', 'Chat', 'project')
    }
  }

  for (const a of opts.agents || []) {
    const tid = a.threadId
    if (!tid || tid === opts.activeThreadId) continue
    if (projectId && a.projectId === projectId) continue
    const label = a.title || 'Agent'
    if (!matchesQuery(label, q) && !matchesQuery('chat', q)) continue
    pushChat(
      tid,
      label,
      a.role === 'overseer' ? 'Overseer' : a.role === 'worker' ? 'Worker' : 'Chat',
      'other',
    )
  }

  for (const t of opts.threads || []) {
    if (t.archived || t.id === opts.activeThreadId) continue
    if (seenThread.has(t.id)) continue
    if (projectId && projectThreadSet.has(t.id)) continue
    const label = t.title || 'New chat'
    if (!matchesQuery(label, q) && !matchesQuery('chat', q)) continue
    pushChat(t.id, label, 'Prior chat', 'other')
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

/** Default workspace path for “Save plan” before Build. */
export const CHAT_PLAN_WORKSPACE_PATH = 'plans/latest.md'

/** Seed / normalize editable Plan artifact text from the last assistant reply. */
export function extractPlanArtifactText(assistantMarkdown: string | undefined | null): string {
  const raw = String(assistantMarkdown || '').trim()
  if (!raw) return ''
  // Prefer an explicitly tagged ```plan / ```markdown / ```md fence only —
  // never steal the first unlabeled code block (snippets are not the plan).
  const fence = /```(plan|markdown|md)\s*\n([\s\S]*?)```/i.exec(raw)
  if (fence?.[2]?.trim()) return fence[2].trim()
  return raw
}
