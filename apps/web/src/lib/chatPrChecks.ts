/**
 * Parse GitHub PR URLs + summarize check status for in-app Diffs glance.
 * Live fetch goes through `/api/chat/github/pr-checks` (App token) — this module
 * is pure helpers for URL parse + label formatting.
 */

export type ChatPrRef = {
  owner: string
  repo: string
  number: number
}

export type ChatPrCheckState = 'success' | 'pending' | 'failure' | 'error' | 'unknown'

export type ChatPrCheckSummary = {
  state: ChatPrCheckState
  total: number
  success: number
  failure: number
  pending: number
  /** Short chip label, e.g. "Checks · 3/3". */
  label: string
  /** Optional detail for title tooltip. */
  detail?: string
}

/** Parse owner/repo/number from a github.com pull request URL (or html_url). */
export function parseGithubPrUrl(raw: string | undefined | null): ChatPrRef | null {
  const s = String(raw || '').trim()
  if (!s) return null
  const m =
    /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)/i.exec(s) ||
    /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#(\d+)$/.exec(s)
  if (!m) return null
  const number = Number(m[3])
  if (!Number.isFinite(number) || number < 1) return null
  return { owner: m[1]!, repo: m[2]!, number }
}

export function summarizePrChecks(input: {
  state?: string
  total?: number
  success?: number
  failure?: number
  pending?: number
  detail?: string
}): ChatPrCheckSummary {
  const total = Math.max(0, Number(input.total) || 0)
  const success = Math.max(0, Number(input.success) || 0)
  const failure = Math.max(0, Number(input.failure) || 0)
  const pending = Math.max(0, Number(input.pending) || 0)
  const raw = String(input.state || '').toLowerCase()
  let state: ChatPrCheckState = 'unknown'
  if (raw === 'success' || raw === 'pending' || raw === 'failure' || raw === 'error') {
    state = raw
  } else if (failure > 0) state = 'failure'
  else if (pending > 0) state = 'pending'
  else if (total > 0 && success === total) state = 'success'
  else if (total === 0) state = 'unknown'

  let label = 'Checks'
  if (total > 0) {
    if (state === 'failure') label = `Checks · ${failure} fail`
    else if (state === 'pending') label = `Checks · ${success}/${total}`
    else if (state === 'success') label = `Checks · ${success}/${total}`
    else label = `Checks · ${total}`
  } else if (state === 'pending') {
    label = 'Checks · …'
  } else if (state === 'success') {
    label = 'Checks · ok'
  } else if (state === 'failure') {
    label = 'Checks · fail'
  }

  return {
    state,
    total,
    success,
    failure,
    pending,
    label,
    detail: input.detail,
  }
}

/** Drag MIME for chat → Project drop. */
export const CHAT_THREAD_DRAG_MIME = 'application/x-yue-chat-thread'
