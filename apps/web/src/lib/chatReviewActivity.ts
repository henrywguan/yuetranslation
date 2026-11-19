/**
 * Diffs + Runs activity for `#/chat` Phase 3 review panes.
 * Fed by SSE sandbox/workspace tool events + Inbox reviewUrl — not a full IDE.
 */

export type ChatDiffEntry = {
  id: string
  path: string
  /** Latest text snapshot (sandbox/workspace write). */
  text?: string
  source: 'sandbox' | 'workspace' | 'git'
  at: number
}

export type ChatRunEntry = {
  id: string
  argv: string[]
  stdout?: string
  stderr?: string
  exitCode?: number
  ok?: boolean
  at: number
}

export type ChatReviewActivity = {
  diffs: ChatDiffEntry[]
  runs: ChatRunEntry[]
  /** Latest PR / review link from tools or Inbox agent. */
  reviewUrl?: string
}

export const CHAT_REVIEW_MAX_DIFFS = 40
export const CHAT_REVIEW_MAX_RUNS = 40
export const CHAT_REVIEW_TEXT_CAP = 80_000

function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'crypto' in globalThis && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function emptyReviewActivity(): ChatReviewActivity {
  return { diffs: [], runs: [] }
}

export function truncateReviewText(text: string | undefined): string | undefined {
  if (typeof text !== 'string') return undefined
  return text.length > CHAT_REVIEW_TEXT_CAP ? text.slice(0, CHAT_REVIEW_TEXT_CAP) : text
}

/** Normalize a sandbox / workspace SSE activity payload into diffs + runs. */
export function applySandboxActivity(
  state: ChatReviewActivity,
  raw: Record<string, unknown>,
): ChatReviewActivity {
  const kind = String(raw.kind || '')
  const at = typeof raw.at === 'number' ? raw.at : Date.now()
  let next = state

  if (kind === 'diff' || kind === 'write') {
    const path = String(raw.path || '').trim().slice(0, 240)
    if (!path) return state
    const source =
      raw.source === 'workspace' || raw.source === 'git' || raw.source === 'sandbox'
        ? raw.source
        : 'sandbox'
    const entry: ChatDiffEntry = {
      id: uid('diff'),
      path,
      text: truncateReviewText(typeof raw.text === 'string' ? raw.text : undefined),
      source,
      at,
    }
    const without = state.diffs.filter((d) => d.path !== path)
    next = {
      ...state,
      diffs: [entry, ...without].slice(0, CHAT_REVIEW_MAX_DIFFS),
    }
  }

  if (kind === 'run' || kind === 'exec') {
    const argv = Array.isArray(raw.argv)
      ? raw.argv.map((a) => String(a)).slice(0, 32)
      : []
    if (!argv.length) return next
    const entry: ChatRunEntry = {
      id: uid('run'),
      argv,
      stdout: truncateReviewText(typeof raw.stdout === 'string' ? raw.stdout : undefined),
      stderr: truncateReviewText(typeof raw.stderr === 'string' ? raw.stderr : undefined),
      exitCode: typeof raw.exitCode === 'number' ? raw.exitCode : undefined,
      ok: typeof raw.ok === 'boolean' ? raw.ok : undefined,
      at,
    }
    next = {
      ...next,
      runs: [entry, ...next.runs].slice(0, CHAT_REVIEW_MAX_RUNS),
    }
  }

  if (kind === 'pr' || kind === 'review') {
    const url = typeof raw.reviewUrl === 'string' ? raw.reviewUrl.trim() : ''
    if (url) next = { ...next, reviewUrl: url.slice(0, 2000) }
  }

  return next
}

/** Merge harness workspace file writes into the diffs list. */
export function applyWorkspaceFilesToDiffs(
  state: ChatReviewActivity,
  files: Array<{ path?: string; text?: string }>,
): ChatReviewActivity {
  let next = state
  for (const f of files) {
    const path = String(f.path || '').trim()
    if (!path) continue
    next = applySandboxActivity(next, {
      kind: 'diff',
      path,
      text: f.text,
      source: 'workspace',
      at: Date.now(),
    })
  }
  return next
}

/** Parse `git diff` / `git status` stdout into synthetic diff entries (path-only when no patch). */
export function diffsFromGitOutput(
  stdout: string,
  opts?: { at?: number },
): ChatDiffEntry[] {
  const at = opts?.at ?? Date.now()
  const text = String(stdout || '')
  if (!text.trim()) return []
  // Unified diff: extract --- a/path blocks; else treat as status list.
  const paths = new Set<string>()
  for (const line of text.split('\n')) {
    const m =
      /^diff --git a\/(.+?) b\//.exec(line) ||
      /^\+\+\+ b\/(.+)$/.exec(line) ||
      /^--- a\/(.+)$/.exec(line) ||
      /^[ AM?\t]+(.+)$/.exec(line)
    if (m?.[1] && m[1] !== '/dev/null') paths.add(m[1].trim())
  }
  if (!paths.size) {
    return [
      {
        id: uid('diff'),
        path: '(git output)',
        text: truncateReviewText(text),
        source: 'git',
        at,
      },
    ]
  }
  return [...paths].slice(0, CHAT_REVIEW_MAX_DIFFS).map((path) => ({
    id: uid('diff'),
    path,
    text: truncateReviewText(text),
    source: 'git' as const,
    at,
  }))
}

export function mergeGitDiffs(
  state: ChatReviewActivity,
  stdout: string,
): ChatReviewActivity {
  const entries = diffsFromGitOutput(stdout)
  if (!entries.length) return state
  const byPath = new Map(state.diffs.map((d) => [d.path, d]))
  for (const e of entries) byPath.set(e.path, e)
  return {
    ...state,
    diffs: [...byPath.values()]
      .sort((a, b) => b.at - a.at)
      .slice(0, CHAT_REVIEW_MAX_DIFFS),
  }
}

export function formatArgv(argv: string[]): string {
  return argv.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')
}

export type ReviewPaneTab = 'diffs' | 'runs'

/** When to show the review rail — bound workspace, PR, or live activity. */
export function shouldShowReviewRail(opts: {
  activity: ChatReviewActivity
  hasBoundWorkspace: boolean
  hasInReview: boolean
}): boolean {
  if (opts.activity.diffs.length > 0) return true
  if (opts.activity.runs.length > 0) return true
  if (opts.activity.reviewUrl) return true
  if (opts.hasInReview) return true
  if (opts.hasBoundWorkspace) return true
  return false
}
