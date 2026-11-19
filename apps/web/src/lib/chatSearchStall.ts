/**
 * Client-side deferred search / tool-stall detectors for #/chat.
 * Keep patterns in sync with apps/api `deepseekChatHarness.ts`.
 */

/** Match short "I'll search…" / "I'll look into…" stopovers with no web tool follow-through. */
export function looksLikeDeferredSearch(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || t.length > 480) return false
  if ((t.match(/\n/g) || []).length >= 4) return false
  return (
    /\b(i(?:['’]ll| will)|let me|i am going to|i'm going to)\b[\s\S]{0,80}\b(search|look\s+(?:up|into)|investigate|research|dig\s+into|find\s+out|check (?:the )?(?:web|online|news)|find (?:the )?latest)\b/i.test(
      t,
    ) ||
    /^(?:i(?:['’]ll| will)|let me)\s+(?:search|look\s+(?:up|into)|investigate|research)\b/i.test(
      t,
    )
  )
}

/** Visible reply + optional DeepThink reasoning (same as harness `looksLikeDeferredSearchTurn`). */
export function looksLikeDeferredSearchTurn(content: string, reasoning = ''): boolean {
  if (looksLikeDeferredSearch(content)) return true
  const body = String(content || '').trim()
  const think = String(reasoning || '').trim()
  if (!think || !looksLikeDeferredSearch(think)) return false
  if (!body) return true
  if (body.length > 120 || (body.match(/\n/g) || []).length >= 1) return false
  return /^(?:sure|ok|okay|one moment|hang on|got it|alright|let me (?:see|check)|i(?:['’]ll| will) (?:check|see))[.!]?\s*$/i.test(
    body,
  )
}

export const SEARCH_STALL_ERROR =
  'Search was on, but the reply only announced looking something up — no web search ran. Tap Continue, type “continue”, or ask again so it calls deepseek_web_search.'

/** Soft client-tool announce without tool_calls (weather / fetch / etc.). */
export function looksLikeDeferredToolUse(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || t.length > 480) return false
  if ((t.match(/\n/g) || []).length >= 4) return false
  return (
    /\b(i(?:['’]ll| will)|let me|i am going to|i'm going to)\b[\s\S]{0,80}\b(check|fetch|look up|get|call|use|run|calculate|convert)\b[\s\S]{0,100}\b(weather|forecast|url|page|link|calendar|date|time|math|units?|tool|jyut|phrase|temperature)\b/i.test(
      t,
    ) ||
    /\b(get_weather|fetch_url|get_date|get_now|calc|convert_units|jyut_plan_limits|jyut_phrase_lookup|jyut_learn_hint|generate_image|workspace_|sandbox_|project_)\w*\b/i.test(
      t,
    )
  )
}

export const TOOL_STALL_ERROR =
  'The reply announced a tool but never ran one. Tap Continue or rephrase so it emits tool_calls — silent stop means the turn stalled.'
