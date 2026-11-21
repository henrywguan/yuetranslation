/**
 * Client-side deferred search / tool-stall detectors for #/chat.
 * Keep patterns in sync with apps/api `deepseekChatHarness.ts`.
 */

/** Match short "I'll search…" / "I'll look into…" / "I'll check…" / "Running the searches now" stopovers. */
export function looksLikeDeferredSearch(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || t.length > 480) return false
  if ((t.match(/\n/g) || []).length >= 4) return false
  return (
    /\b(i(?:['’]ll| will)|let me|i am going to|i'm going to)\b[\s\S]{0,100}\b(search(?:es|ing)?|look\s+(?:up|into)|investigate|research|dig\s+into|find\s+out|check (?:the )?(?:web|online|news)|find (?:the )?latest|check\b[\s\S]{0,40}\b(?:what'?s\s+new|latest|updates?|news|this\s+week))\b/i.test(
      t,
    ) ||
    /^(?:i(?:['’]ll| will)|let me)\s+(?:search|look\s+(?:up|into)|investigate|research)\b/i.test(
      t,
    ) ||
    /\b(?:running|starting|doing|performing)\b[\s\S]{0,48}\bsearches?\b/i.test(t) ||
    /\bsearches?\s+(?:now|next)\b/i.test(t) ||
    /^(?:sure[,.]?\s*|ok(?:ay)?[,.]?\s*)?(?:i(?:['’]ll| will)|let me)\s+check(?:\s+(?:for\s+you|that|this|it))?[.…!\s]*$/i.test(
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
  return /^(?:sure|ok|okay|one moment|hang on|got it|alright|let me (?:see|check)|i(?:['’]ll| will) (?:check|see)|one moment while i (?:search|check|look))[.!…⋯]*\s*$/i.test(
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
    // Ricing / mockup path: "Let me pull up those exact widgets and the guide…"
    /\b(i(?:['’]ll| will)|let me|i am going to|i'm going to)\b[\s\S]{0,100}\b(pull\s+up|grab|find|open|gather|look\s+up)\b[\s\S]{0,120}\b(widgets?|guides?|links?|mockups?|images?|splash|screenshots?|deviantart|medium)\b/i.test(
      t,
    ) ||
    /\b(get_weather|fetch_url|get_date|get_now|calc|convert_units|jyut_plan_limits|jyut_phrase_lookup|jyut_learn_hint|generate_image|workspace_|sandbox_|project_)\w*\b/i.test(
      t,
    )
  )
}

export const TOOL_STALL_ERROR =
  'The reply announced a tool but never ran one. Tap Continue or rephrase so it emits tool_calls — silent stop means the turn stalled.'
