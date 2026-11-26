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

/** Per-path Keep / Reject decision for Diffs review (PR2). */
export type ChatDiffDecision = 'pending' | 'kept' | 'rejected'

export type ChatReviewActivity = {
  diffs: ChatDiffEntry[]
  runs: ChatRunEntry[]
  /** Latest PR / review link from tools or Inbox agent. */
  reviewUrl?: string
  /** Path → Keep/Reject. Missing key = pending. Reset when a path is rewritten. */
  decisions?: Record<string, ChatDiffDecision>
}

export const CHAT_REVIEW_MAX_DIFFS = 40
export const CHAT_REVIEW_MAX_RUNS = 40
export const CHAT_REVIEW_TEXT_CAP = 80_000

/**
 * Diff pane paint caps — sibling to LIVE_MARKDOWN_STREAM_MAX / LIVE_REASONING_PAINT.
 * Per-line React spans + long HTML lines freeze the tab when Agent writes ~28KB+
 * index.html (three.js splash) into Diffs while Working is still on.
 */
export const CHAT_DIFF_HIGHLIGHT_MAX_CHARS = 12_000
export const CHAT_DIFF_HIGHLIGHT_MAX_LINES = 200
export const CHAT_DIFF_PLAIN_PAINT_CHARS = 8_000
export const CHAT_DIFF_MAX_LINE_CHARS = 320
/** Snapshot → +lined preview: keep under highlight caps so DiffPreview stays cheap. */
export const CHAT_DIFF_SNAPSHOT_MAX_LINES = 160

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
    // Fresh write resets Keep/Reject for this path.
    const decisions = { ...(state.decisions || {}) }
    delete decisions[path]
    next = {
      ...state,
      diffs: [entry, ...without].slice(0, CHAT_REVIEW_MAX_DIFFS),
      decisions: Object.keys(decisions).length ? decisions : undefined,
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

/**
 * Split a unified `git diff` into per-path patch text.
 * Falls back to empty map when stdout is not a unified diff (e.g. status --short).
 */
export function splitUnifiedDiffByPath(stdout: string): Map<string, string> {
  const text = String(stdout || '')
  const out = new Map<string, string>()
  if (!text.trim()) return out
  const lines = text.split('\n')
  let curPath: string | null = null
  let buf: string[] = []
  const flush = () => {
    if (curPath && buf.length) {
      out.set(curPath, buf.join('\n'))
    }
    curPath = null
    buf = []
  }
  for (const line of lines) {
    const gitHeader = /^diff --git a\/(.+?) b\/(.+)$/.exec(line)
    if (gitHeader) {
      flush()
      const path = (gitHeader[2] || gitHeader[1] || '').trim()
      curPath = path && path !== '/dev/null' ? path : null
      if (curPath) buf = [line]
      continue
    }
    if (curPath) buf.push(line)
  }
  flush()
  return out
}

/** Parse `git diff` / `git status` stdout into synthetic diff entries (per-file patch when possible). */
export function diffsFromGitOutput(
  stdout: string,
  opts?: { at?: number },
): ChatDiffEntry[] {
  const at = opts?.at ?? Date.now()
  const text = String(stdout || '')
  if (!text.trim()) return []

  const byPath = splitUnifiedDiffByPath(text)
  if (byPath.size) {
    return [...byPath.entries()].slice(0, CHAT_REVIEW_MAX_DIFFS).map(([path, patch]) => ({
      id: uid('diff'),
      path,
      text: truncateReviewText(patch),
      source: 'git' as const,
      at,
    }))
  }

  // Status-style / non-unified output: path list, attach full stdout only to a single entry.
  const paths = new Set<string>()
  for (const line of text.split('\n')) {
    const m =
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
  const pathsArr = [...paths].slice(0, CHAT_REVIEW_MAX_DIFFS)
  return pathsArr.map((path, i) => ({
    id: uid('diff'),
    path,
    // Attach full status dump once — avoid duplicating the same blob on every path.
    text: i === 0 ? truncateReviewText(text) : undefined,
    source: 'git' as const,
    at,
  }))
}

/** Truncate a single diff line so layout does not choke on minified HTML. */
export function truncateDiffLine(line: string, max = CHAT_DIFF_MAX_LINE_CHARS): string {
  if (line.length <= max) return line
  return `${line.slice(0, max)}…`
}

/**
 * True when Diffs should paint a single plain `<pre>` instead of per-line spans.
 * Busy Agent turns always use plain — parent re-renders would otherwise rebuild
 * hundreds of highlighted nodes on every SSE tick.
 */
export function shouldUsePlainDiffPreview(opts: {
  text: string
  busy?: boolean
}): boolean {
  if (opts.busy) return true
  const text = opts.text || ''
  if (text.length > CHAT_DIFF_HIGHLIGHT_MAX_CHARS) return true
  // Cheap line estimate without allocating a full split when tiny.
  if (text.length <= CHAT_DIFF_HIGHLIGHT_MAX_CHARS) {
    let lines = 1
    for (let i = 0; i < text.length; i += 1) {
      if (text.charCodeAt(i) === 10) {
        lines += 1
        if (lines > CHAT_DIFF_HIGHLIGHT_MAX_LINES) return true
      }
    }
  }
  return false
}

/** Plain live tail for Diffs while busy / oversized — keeps Working feedback without lockup. */
export function plainDiffPreviewText(text: string): string {
  const body = String(text || '')
  if (body.length <= CHAT_DIFF_PLAIN_PAINT_CHARS) return body
  return `… (${body.length - CHAT_DIFF_PLAIN_PAINT_CHARS} chars above)\n${body.slice(-CHAT_DIFF_PLAIN_PAINT_CHARS)}`
}

/** Render a sandbox/workspace file snapshot as a simple +lined preview when no unified diff. */
export function snapshotAsPatchPreview(path: string, text: string | undefined): string {
  const body = String(text || '')
  if (!body) return `--- a/${path}\n+++ b/${path}\n@@ (empty write) @@\n`
  const lines = body.split('\n')
  const capped = lines.length > CHAT_DIFF_SNAPSHOT_MAX_LINES
    ? lines.slice(0, CHAT_DIFF_SNAPSHOT_MAX_LINES)
    : lines
  const numbered = capped.map((l) => `+${truncateDiffLine(l)}`).join('\n')
  const more =
    lines.length > CHAT_DIFF_SNAPSHOT_MAX_LINES
      ? `\n… (${lines.length - CHAT_DIFF_SNAPSHOT_MAX_LINES} more lines)`
      : ''
  return `--- /dev/null\n+++ b/${path}\n@@\n${numbered}${more}`
}

export function mergeGitDiffs(
  state: ChatReviewActivity,
  stdout: string,
): ChatReviewActivity {
  const entries = diffsFromGitOutput(stdout)
  if (!entries.length) return state
  const byPath = new Map(state.diffs.map((d) => [d.path, d]))
  const decisions = { ...(state.decisions || {}) }
  for (const e of entries) {
    byPath.set(e.path, e)
    // Fresh git refresh clears prior Keep/Reject for rewritten paths.
    delete decisions[e.path]
  }
  return {
    ...state,
    diffs: [...byPath.values()]
      .sort((a, b) => b.at - a.at)
      .slice(0, CHAT_REVIEW_MAX_DIFFS),
    decisions: Object.keys(decisions).length ? decisions : undefined,
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
