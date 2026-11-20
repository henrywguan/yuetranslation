/**
 * Inline tool-call / activity cards for `#/chat` Agent replies.
 * Maps searchSteps + sandbox SSE activity into Cursor-like expandable chips.
 */

import type { ChatSearchStep } from './chatHistory.js'

export type ChatToolCardKind =
  | 'search'
  | 'browse'
  | 'image'
  | 'read'
  | 'write'
  | 'exec'
  | 'pr'
  | 'tool'
  | 'other'

export type ChatToolCard = {
  id: string
  kind: ChatToolCardKind
  /** Short chip label — “Searching…”, “Wrote App.tsx”. */
  label: string
  /** Optional secondary line in the summary. */
  detail?: string
  /** Expandable body (snippet / stdout / path). */
  body?: string
  /** True while this card is the live tail of a streaming turn. */
  live?: boolean
}

const MAX_BODY = 4_000

function clip(text: string | undefined, max = MAX_BODY): string | undefined {
  if (typeof text !== 'string') return undefined
  const t = text.trim()
  if (!t) return undefined
  return t.length > max ? `${t.slice(0, max)}…` : t
}

export function classifyToolStepKind(raw: string): ChatToolCardKind {
  const k = String(raw || '').toLowerCase()
  if (/image_search|image/.test(k)) return 'image'
  if (/search|web_search|call_started|call_completed/.test(k)) return 'search'
  if (/browse|open|fetch|visit|crawl/.test(k)) return 'browse'
  if (/read|sandbox_read|workspace_read|list/.test(k)) return 'read'
  if (/write|sandbox_write|workspace_write|diff/.test(k)) return 'write'
  if (/exec|run|sandbox_exec|shell/.test(k)) return 'exec'
  if (/pr|pull_request|review|github/.test(k)) return 'pr'
  if (/tool|function|mcp/.test(k)) return 'tool'
  return 'other'
}

export function toolCardLabel(kind: ChatToolCardKind, live?: boolean): string {
  switch (kind) {
    case 'search':
      return live ? 'Searching…' : 'Searched'
    case 'browse':
      return live ? 'Reading page…' : 'Read page'
    case 'image':
      return live ? 'Searching images…' : 'Image search'
    case 'read':
      return live ? 'Reading file…' : 'Read file'
    case 'write':
      return live ? 'Writing…' : 'Wrote file'
    case 'exec':
      return live ? 'Running…' : 'Ran command'
    case 'pr':
      return live ? 'Opening PR…' : 'Opened PR'
    case 'tool':
      return live ? 'Running tool…' : 'Ran tool'
    default:
      return live ? 'Working…' : 'Activity'
  }
}

/** Map a persisted / streamed search step into a display card. */
export function toolCardFromSearchStep(
  step: ChatSearchStep,
  index: number,
  opts?: { live?: boolean },
): ChatToolCard {
  const kind = classifyToolStepKind(step.kind)
  const detail =
    step.queries?.filter(Boolean).join(' · ') ||
    step.title ||
    step.url ||
    step.siteName ||
    undefined
  const body = clip(step.snippet) || (step.images?.length ? `${step.images.length} images` : undefined)
  const live = opts?.live === true
  let label = toolCardLabel(kind, live)
  if (kind === 'search' && step.queries?.[0]) {
    label = live ? `Searching “${step.queries[0].slice(0, 48)}”` : `Searched “${step.queries[0].slice(0, 48)}”`
  } else if ((kind === 'browse' || kind === 'read') && (step.title || step.url)) {
    const t = (step.title || step.url || '').slice(0, 56)
    label = live ? `Reading ${t}` : `Read ${t}`
  }
  return {
    id: `step-${index}-${kind}-${(detail || step.kind || '').slice(0, 24)}`,
    kind,
    label,
    detail: detail && detail !== label ? detail.slice(0, 120) : undefined,
    body,
    live,
  }
}

/** Map a sandbox / workspace SSE activity payload into an inline tool card. */
export function toolCardFromSandboxActivity(
  raw: Record<string, unknown>,
  index: number,
  opts?: { live?: boolean },
): ChatToolCard | null {
  const kindRaw = String(raw.kind || '')
  const live = opts?.live === true
  if (kindRaw === 'diff' || kindRaw === 'write') {
    const path = String(raw.path || '').trim().slice(0, 120)
    if (!path) return null
    const source = raw.source === 'workspace' ? 'workspace' : raw.source === 'git' ? 'git' : 'sandbox'
    const text = typeof raw.text === 'string' ? raw.text : undefined
    return {
      id: `sbx-diff-${index}-${path}`,
      kind: 'write',
      label: live ? `Writing ${path}` : `Wrote ${path}`,
      detail: source,
      body: clip(text),
      live,
    }
  }
  if (kindRaw === 'run' || kindRaw === 'exec') {
    const argv = Array.isArray(raw.argv) ? raw.argv.map((a) => String(a)).slice(0, 16) : []
    if (!argv.length) return null
    const cmd = argv.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')
    const out = [typeof raw.stdout === 'string' ? raw.stdout : '', typeof raw.stderr === 'string' ? raw.stderr : '']
      .filter(Boolean)
      .join('\n')
    const exit =
      typeof raw.exitCode === 'number' ? `exit ${raw.exitCode}` : raw.ok === false ? 'failed' : undefined
    return {
      id: `sbx-run-${index}-${cmd.slice(0, 40)}`,
      kind: 'exec',
      label: live ? `Running ${cmd.slice(0, 64)}` : `Ran ${cmd.slice(0, 64)}`,
      detail: exit,
      body: clip(out),
      live,
    }
  }
  if (kindRaw === 'pr' || kindRaw === 'review') {
    const url = typeof raw.reviewUrl === 'string' ? raw.reviewUrl.trim() : ''
    if (!url) return null
    return {
      id: `sbx-pr-${index}`,
      kind: 'pr',
      label: live ? 'Opening PR…' : 'Opened PR',
      detail: url.slice(0, 120),
      body: url,
      live,
    }
  }
  return null
}

/** Build the list shown under an assistant bubble (search + optional live sandbox). */
export function buildToolCards(opts: {
  searchSteps?: ChatSearchStep[]
  sandboxActivities?: Array<Record<string, unknown>>
  streaming?: boolean
}): ChatToolCard[] {
  const cards: ChatToolCard[] = []
  const steps = opts.searchSteps || []
  for (let i = 0; i < steps.length; i++) {
    const live = Boolean(opts.streaming && i === steps.length - 1 && !opts.sandboxActivities?.length)
    cards.push(toolCardFromSearchStep(steps[i]!, i, { live }))
  }
  const acts = opts.sandboxActivities || []
  for (let i = 0; i < acts.length; i++) {
    const live = Boolean(opts.streaming && i === acts.length - 1)
    const card = toolCardFromSandboxActivity(acts[i]!, steps.length + i, { live })
    if (card) cards.push(card)
  }
  return cards.slice(-32)
}

/** Fold sandbox SSE into ChatSearchStep so tool cards persist on the message. */
export function searchStepFromSandboxActivity(
  raw: Record<string, unknown>,
): ChatSearchStep | null {
  const kindRaw = String(raw.kind || '')
  if (kindRaw === 'diff' || kindRaw === 'write') {
    const path = String(raw.path || '').trim().slice(0, 240)
    if (!path) return null
    const text = typeof raw.text === 'string' ? raw.text : undefined
    return {
      kind: 'sandbox_write',
      title: path,
      siteName: raw.source === 'workspace' ? 'workspace' : 'sandbox',
      snippet: text ? text.slice(0, 1_200) : undefined,
    }
  }
  if (kindRaw === 'run' || kindRaw === 'exec') {
    const argv = Array.isArray(raw.argv) ? raw.argv.map((a) => String(a)).slice(0, 32) : []
    if (!argv.length) return null
    const cmd = argv.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')
    const out = [typeof raw.stdout === 'string' ? raw.stdout : '', typeof raw.stderr === 'string' ? raw.stderr : '']
      .filter(Boolean)
      .join('\n')
      .slice(0, 1_200)
    return {
      kind: 'sandbox_exec',
      title: cmd.slice(0, 160),
      snippet: out || undefined,
    }
  }
  if (kindRaw === 'pr' || kindRaw === 'review') {
    const url = typeof raw.reviewUrl === 'string' ? raw.reviewUrl.trim() : ''
    if (!url) return null
    return { kind: 'github_pr', title: 'Pull request', url, snippet: url }
  }
  return null
}
