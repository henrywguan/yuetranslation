/**
 * Dynamic system prompt for DeepSeek Chat — temporal grounding, freshness rules,
 * and JyutTranslate-native skill catalog (no paid APIs).
 */

export type DeepseekChatPromptContext = {
  /** IANA timezone from the client (e.g. America/Los_Angeles). */
  timeZone?: string
  /** BCP-47 locale hint (e.g. en-US). */
  locale?: string
  /** Plan label for product-skill hints (family / business / admin). */
  plan?: string
  now?: Date
}

const BASE = [
  'You are a helpful AI assistant.',
  'Give accurate, well-structured answers.',
  'When a question benefits from detail (guides, comparisons, plans), be thorough and organized — use headings, bullets, or tables when they help.',
  'Use the language the user writes in unless they ask otherwise.',
].join(' ')

const FRESHNESS = [
  'Freshness: for "today/tomorrow/yesterday", current day-of-week, live prices, news, sports scores, or anything that may have changed after your knowledge cutoff, prefer tools or web search over guessing.',
  'When temporal context below is present, treat it as authoritative for "now".',
  'If a tool is available for date/time, call it rather than claiming you have no clock.',
].join(' ')

const SKILLS = [
  'Available capabilities (use tools when they match):',
  '- Clock/calendar: get_date, get_now, calendar_math.',
  '- Math/units: calc, convert_units.',
  '- Weather: get_weather (Open-Meteo).',
  '- Web page: fetch_url (public https only).',
  '- JyutTranslate: jyut_plan_limits (plan quotas), jyut_phrase_lookup (offline phrase memory), jyut_learn_hint (Harbor Quest / Learn).',
  'Do not invent JyutTranslate plan numbers — call jyut_plan_limits.',
  'For Cantonese/Jyutping phrase help, try jyut_phrase_lookup first; if miss, answer normally and suggest Solo translate in the app.',
].join('\n')

function resolveTimeZone(raw?: string): string {
  const tz = String(raw || '').trim()
  if (!tz) return 'UTC'
  try {
    // Throws RangeError for invalid IANA zones.
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
    return tz
  } catch {
    return 'UTC'
  }
}

function resolveLocale(raw?: string): string {
  const locale = String(raw || '').trim() || 'en-US'
  try {
    Intl.DateTimeFormat(locale).format(new Date())
    return locale
  } catch {
    return 'en-US'
  }
}

/** Weekday + calendar date in the user's zone (and UTC). */
export function formatTemporalBlock(ctx: DeepseekChatPromptContext = {}): string {
  const now = ctx.now ?? new Date()
  const timeZone = resolveTimeZone(ctx.timeZone)
  const locale = resolveLocale(ctx.locale)

  const local = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)

  const utc = now.toISOString()
  return [
    `Current datetime (UTC): ${utc}`,
    `User timezone: ${timeZone}`,
    `Local datetime for user: ${local}`,
  ].join('\n')
}

/** Static base string kept for smoke / docs that import DEEPSEEK_CHAT_SYSTEM. */
export const DEEPSEEK_CHAT_SYSTEM_BASE = BASE

/**
 * Full system prompt for a chat turn.
 * Includes temporal grounding so "what day is today?" is answerable without search.
 */
export function buildDeepseekChatSystem(ctx: DeepseekChatPromptContext = {}): string {
  const parts = [BASE, FRESHNESS, formatTemporalBlock(ctx), SKILLS]
  if (ctx.plan) parts.push(`Signed-in plan context: ${ctx.plan}.`)
  return parts.join('\n\n')
}

/**
 * Heuristic: auto-enable web search for freshness / news intents when the user
 * left Search off. Temporal questions alone do NOT force search (clock injection covers them).
 * Keep this strict — false positives burn DeepSeek search quota on textbook questions.
 */
export function shouldAutoEnableSearch(userText: string): boolean {
  const t = userText.trim().toLowerCase()
  if (!t) return false
  if (/\b(breaking news|today'?s news|current events|latest headlines?)\b/i.test(t)) return true
  if (/\b(what'?s|what is) happening (today|right now|in the world)\b/i.test(t)) return true
  if (/\blatest (news|on|about)\b/i.test(t)) return true
  if (/\b(bitcoin|btc|eth)\b.+\b(price|worth)\b/i.test(t) || /\b(price|worth)\b.+\b(bitcoin|btc)\b/i.test(t)) {
    return true
  }
  if (/\bstock price of\b/i.test(t) || /\b(share|stock) price\b/i.test(t)) return true
  // Live office-holders — require "current/incumbent/new" near a role
  if (/\b(current|incumbent|newly elected)\b.{0,40}\b(president|prime minister|ceo|champion)\b/i.test(t)) {
    return true
  }
  if (/\bwho is (the )?(current|new)\b/i.test(t)) return true
  if (/\bwho won\b.+\b(yesterday|today|this (week|month|year)|last night)\b/i.test(t)) return true
  return false
}

export { resolveTimeZone }
