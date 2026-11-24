/**
 * Client recovery when Agent/Harness tools land work but the visible reply is empty.
 * Mirrors apps/api `deepseekChatWorkRecovery.ts` — keep copy + path rules in sync via smokes.
 */

export type AgentWorkSummaryInput = {
  workspacePaths?: string[]
  imageCount?: number
  toolsUsed?: boolean
  projectActions?: number
}

export function normalizeAgentWorkRecoveryPaths(paths: string[] | undefined): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of paths || []) {
    const p = String(raw || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\.\/+/, '')
      .slice(0, 180)
    if (!p || seen.has(p)) continue
    seen.add(p)
    out.push(p)
    if (out.length >= 20) break
  }
  return out
}

/** Path from a sandbox/workspace SSE activity (diff/write only). */
export function pathFromSandboxActivity(activity: Record<string, unknown> | null | undefined): string | null {
  if (!activity || typeof activity !== 'object') return null
  const kind = String(activity.kind || '')
  if (kind !== 'diff' && kind !== 'write') return null
  const path = String(activity.path || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .slice(0, 180)
  return path || null
}

/** Generic tools-finished stub from a prior empty-final recovery. */
export function isNoSummaryAgentStub(text: string): boolean {
  const t = String(text || '')
  return /tools finished this turn/i.test(t) && /no final summary/i.test(t)
}

/**
 * User asked to continue and/or build something they can view (website / splash / html).
 */
export function looksLikeBuildOrViewRequest(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || t.length > 2400) return false
  const wantsBuild =
    /\b(build|write|create|make|generate|finish|complete)\b/i.test(t) &&
    /\b(website|web\s*site|site|page|splash|html|index\.html|preview|workspace)\b/i.test(t)
  const wantsView =
    /\b(so (?:i|we) can|so that (?:i|we) can)\b[\s\S]{0,48}\b(view|see|open|preview|look)\b/i.test(
      t,
    ) || /\b(view|preview|open)\b[\s\S]{0,40}\b(website|site|page|splash|html)\b/i.test(t)
  const continueBuild =
    /\bcontinue\b/i.test(t) &&
    (wantsBuild || wantsView || /\b(build|website|splash|html|view)\b/i.test(t))
  return wantsBuild || wantsView || continueBuild
}

/**
 * Durable bubble when Continue / empty completion has no new side-effects this turn.
 * Prefer this over leaving only a red "Empty model reply." banner.
 */
export function summarizeEmptyContinueRecovery(input: {
  priorWasNoSummaryStub?: boolean
  userAskedBuildOrView?: boolean
}): string {
  if (input.userAskedBuildOrView) {
    return (
      `I hit an empty completion while finishing your build/view request. ` +
      `Ask me again to write a viewable splash — preferably \`index.html\` plus any CSS/JS — ` +
      `into Workspace (or the sandbox) so you can open Diffs / preview.`
    )
  }
  if (input.priorWasNoSummaryStub) {
    return (
      `Continue hit an empty model reply after the earlier no-summary tool turn. ` +
      `Say what you want next, or ask me to write the files into Workspace so you can review them.`
    )
  }
  return ''
}

/** True when side-effects mean we must not hard-fail with "No reply". */
export function agentTurnHadUsefulWork(input: AgentWorkSummaryInput): boolean {
  return Boolean(summarizeAgentToolWork(input))
}

/**
 * Build a short durable assistant reply from tool side-effects.
 * Returns '' when there is nothing useful to recover from.
 */
export function summarizeAgentToolWork(input: AgentWorkSummaryInput): string {
  const paths = normalizeAgentWorkRecoveryPaths(input.workspacePaths)
  const images = Math.max(0, Math.floor(Number(input.imageCount) || 0))
  const projectActions = Math.max(0, Math.floor(Number(input.projectActions) || 0))
  const toolsUsed = Boolean(input.toolsUsed) || paths.length > 0 || images > 0 || projectActions > 0

  if (paths.length) {
    const list = paths.map((p) => `- \`${p}\``).join('\n')
    const n = paths.length
    return (
      `Done — wrote ${n} workspace file${n === 1 ? '' : 's'} this turn:\n\n` +
      `${list}\n\n` +
      `Open Diffs / Workspace to review. Say if you want changes or a longer walkthrough.`
    )
  }

  if (images > 0) {
    return (
      `Done — generated ${images} image${images === 1 ? '' : 's'} this turn (see above). ` +
      `Say if you want edits or another pass.`
    )
  }

  if (projectActions > 0) {
    return (
      `Done — project tools finished this turn (${projectActions} action` +
      `${projectActions === 1 ? '' : 's'}). Check Needs Attention / workers for follow-ups.`
    )
  }

  if (toolsUsed) {
    return (
      `Done — tools finished this turn, but the model returned no final summary. ` +
      `Ask me to continue or describe what you want next.`
    )
  }

  return ''
}

/** Errors where empty visible text should yield to a work-based recovery bubble. */
export function isEmptyAgentReplyRecoverableError(message: string): boolean {
  const t = String(message || '')
    .replace(/^Error:\s*/i, '')
    .trim()
  if (!t) return false
  return (
    /empty model reply/i.test(t) ||
    /no reply/i.test(t) ||
    /reply stalled/i.test(t) ||
    /CHAT_STREAM_STALL/i.test(t)
  )
}
