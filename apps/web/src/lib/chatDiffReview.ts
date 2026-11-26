/**
 * Diff Keep / Reject / Commit helpers for `#/chat` Diffs panel.
 * Operates against the bound sandbox git session — not local-folder write-back.
 */
import type {
  ChatDiffDecision,
  ChatDiffEntry,
  ChatReviewActivity,
} from './chatReviewActivity.js'

export type { ChatDiffDecision }

export type ChatDiffHunk = {
  /** 0-based index within the file's unified patch. */
  index: number
  /** `@@ -a,b +c,d @@` header (or synthetic). */
  header: string
  /** Full hunk body including header. */
  text: string
}

const COMMIT_NAME = 'JyutTranslate Chat'
const COMMIT_EMAIL = 'chat@jyuttranslate.local'

export function diffDecisionFor(
  activity: ChatReviewActivity,
  path: string,
): ChatDiffDecision {
  const d = activity.decisions?.[path]
  if (d === 'kept' || d === 'rejected') return d
  return 'pending'
}

export function setDiffDecision(
  activity: ChatReviewActivity,
  path: string,
  decision: ChatDiffDecision,
): ChatReviewActivity {
  const p = String(path || '').trim()
  if (!p) return activity
  const decisions = { ...(activity.decisions || {}) }
  if (decision === 'pending') delete decisions[p]
  else decisions[p] = decision
  return { ...activity, decisions }
}

export function clearDiffDecision(
  activity: ChatReviewActivity,
  path: string,
): ChatReviewActivity {
  return setDiffDecision(activity, path, 'pending')
}

/** Drop a path from the diffs list (after Reject settles on disk). */
export function removeDiffPath(
  activity: ChatReviewActivity,
  path: string,
): ChatReviewActivity {
  const p = String(path || '').trim()
  if (!p) return activity
  const decisions = { ...(activity.decisions || {}) }
  delete decisions[p]
  return {
    ...activity,
    diffs: activity.diffs.filter((d) => d.path !== p),
    decisions: Object.keys(decisions).length ? decisions : undefined,
  }
}

export function pendingDiffs(activity: ChatReviewActivity): ChatDiffEntry[] {
  return activity.diffs.filter((d) => diffDecisionFor(activity, d.path) === 'pending')
}

export function keptDiffs(activity: ChatReviewActivity): ChatDiffEntry[] {
  return activity.diffs.filter((d) => diffDecisionFor(activity, d.path) === 'kept')
}

export function countDiffDecisions(activity: ChatReviewActivity): {
  pending: number
  kept: number
  rejected: number
} {
  let pending = 0
  let kept = 0
  let rejected = 0
  for (const d of activity.diffs) {
    const dec = diffDecisionFor(activity, d.path)
    if (dec === 'kept') kept += 1
    else if (dec === 'rejected') rejected += 1
    else pending += 1
  }
  return { pending, kept, rejected }
}

/** Split a single-file unified patch into hunks (header + body). */
export function splitPatchHunks(patch: string): ChatDiffHunk[] {
  const text = String(patch || '')
  if (!text.trim()) return []
  const lines = text.split('\n')
  const hunks: ChatDiffHunk[] = []
  let header = ''
  let buf: string[] = []
  const flush = () => {
    if (!header && !buf.length) return
    const body = header ? [header, ...buf] : buf
    if (!body.length) return
    hunks.push({
      index: hunks.length,
      header: header || `@@ hunk ${hunks.length} @@`,
      text: body.join('\n'),
    })
    header = ''
    buf = []
  }
  for (const line of lines) {
    if (line.startsWith('@@')) {
      flush()
      header = line
      buf = []
      continue
    }
    // Skip file-level meta before the first hunk.
    if (!header && (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++'))) {
      continue
    }
    if (header) buf.push(line)
  }
  flush()
  return hunks
}

/** True when patch text looks like a real unified diff (not a snapshot +preview). */
export function looksLikeUnifiedDiff(text: string | undefined): boolean {
  const t = String(text || '')
  return /^diff --git /m.test(t) || (/^--- /m.test(t) && /^\+\+\+ /m.test(t) && /^@@/m.test(t))
}

/**
 * Detect whether a unified patch is a pure new-file add (`---` /dev/null).
 * Used to choose `rm` vs `git restore` on Reject.
 */
export function isNewFilePatch(text: string | undefined): boolean {
  const t = String(text || '')
  return /^--- \/dev\/null$/m.test(t) || /^diff --git a\/.+ b\/.+\nnew file mode/m.test(t)
}

/** argv: stage one path for commit. */
export function gitAddArgv(path: string): string[] {
  return ['git', 'add', '--', path]
}

/** argv: restore tracked path to HEAD (Reject). */
export function gitRestoreArgv(path: string): string[] {
  return ['git', 'restore', '--source=HEAD', '--worktree', '--staged', '--', path]
}

/** argv: fallback restore via checkout for older git. */
export function gitCheckoutHeadArgv(path: string): string[] {
  return ['git', 'checkout', 'HEAD', '--', path]
}

/** argv: remove an untracked / new-file path. */
export function rmPathArgv(path: string): string[] {
  return ['rm', '-f', '--', path]
}

/** argv: commit staged changes with a fixed sandbox identity. */
export function gitCommitArgv(message: string): string[] {
  const msg = String(message || '').trim().slice(0, 500) || 'chat: keep reviewed diffs'
  return [
    'git',
    '-c',
    `user.name=${COMMIT_NAME}`,
    '-c',
    `user.email=${COMMIT_EMAIL}`,
    'commit',
    '-m',
    msg,
  ]
}

/** argv: status porcelain for one path (detect untracked vs modified). */
export function gitStatusPathArgv(path: string): string[] {
  return ['git', 'status', '--porcelain', '--', path]
}

/**
 * Pick Reject argv sequence for a path given optional patch text + status line.
 * Returns ordered attempts — caller tries until one succeeds.
 */
export function rejectArgvAttempts(opts: {
  path: string
  patchText?: string
  statusPorcelain?: string
}): string[][] {
  const path = opts.path
  const status = String(opts.statusPorcelain || '').trim()
  const untracked = status.startsWith('??') || status.startsWith('A ')
  const newFile = isNewFilePatch(opts.patchText) || untracked
  if (newFile) {
    return [rmPathArgv(path), gitRestoreArgv(path)]
  }
  return [gitRestoreArgv(path), gitCheckoutHeadArgv(path), rmPathArgv(path)]
}

/**
 * After Keep decisions, paths that should be staged before Commit.
 * Falls back to all pending+kept when caller wants "commit everything still listed".
 */
export function pathsToStageForCommit(
  activity: ChatReviewActivity,
  opts?: { includePending?: boolean },
): string[] {
  const out: string[] = []
  for (const d of activity.diffs) {
    const dec = diffDecisionFor(activity, d.path)
    if (dec === 'kept') out.push(d.path)
    else if (opts?.includePending && dec === 'pending') out.push(d.path)
  }
  return out
}

/** Sanitize a commit message for the chrome input. */
export function sanitizeCommitMessage(raw: string): string {
  return String(raw || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, 500)
}

/**
 * Build a mini unified patch containing only the hunks marked for Reject.
 * Used with `git apply --reverse` so multi-hunk files stay intact between regions.
 */
export function buildRejectHunksPatch(opts: {
  path: string
  patch: string
  rejectIndexes: Iterable<number>
}): { ok: true; patch: string; rejectedCount: number } | { ok: false; reason: string } {
  const reject = new Set([...opts.rejectIndexes])
  if (!reject.size) return { ok: false, reason: 'no_rejects' }
  const hunks = splitPatchHunks(opts.patch)
  if (!hunks.length) return { ok: false, reason: 'no_hunks' }
  const selected = hunks.filter((h) => reject.has(h.index))
  if (!selected.length) return { ok: false, reason: 'no_matching_hunks' }
  const path = String(opts.path || '').trim() || 'file'
  const headerLines = [
    `diff --git a/${path} b/${path}`,
    `--- a/${path}`,
    `+++ b/${path}`,
  ]
  const body = selected.map((h) => h.text).join('\n')
  return {
    ok: true,
    patch: `${headerLines.join('\n')}\n${body}\n`,
    rejectedCount: selected.length,
  }
}

/** True when every hunk in the patch is marked for Reject (→ full-file Reject). */
export function allHunksRejected(
  patch: string,
  rejectIndexes: Iterable<number>,
): boolean {
  const hunks = splitPatchHunks(patch)
  if (!hunks.length) return false
  const reject = new Set([...rejectIndexes])
  return hunks.every((h) => reject.has(h.index))
}

/** Sandbox-relative path for a temporary reverse-apply patch. */
export const CHAT_DIFF_REJECT_PATCH_PATH = '.yue-chat-reject.patch'

export function gitApplyReverseArgv(patchPath: string): string[] {
  return ['git', 'apply', '--reverse', '--', patchPath]
}

/** Label for decision chip in the file list. */
export function decisionLabel(d: ChatDiffDecision): string {
  if (d === 'kept') return 'Kept'
  if (d === 'rejected') return 'Rejected'
  return ''
}
