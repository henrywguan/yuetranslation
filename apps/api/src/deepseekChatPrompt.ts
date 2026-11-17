/**
 * Dynamic system prompt for DeepSeek Chat — temporal grounding, freshness rules,
 * and JyutTranslate-native skill catalog (no paid APIs).
 */
import { env } from './env.js'

export type DeepseekChatPromptContext = {
  /** IANA timezone from the client (e.g. America/Los_Angeles). */
  timeZone?: string
  /** BCP-47 locale hint (e.g. en-US). */
  locale?: string
  /**
   * Account Hub primary language (`yue` / `cmn` / `en` / …).
   * Feeds DeepSeek `latest_reminder` Language + system grounding.
   */
  primaryLang?: string
  /** Plan label for product-skill hints (family / business / admin). */
  plan?: string
  now?: Date
  /**
   * `tools` = Completions tool belt (default).
   * `search` kept for legacy callers — harness always uses tools mode + optional web.
   */
  mode?: 'tools' | 'search'
  /** When true, native deepseek_web_search / deepseek_read_url are declared. */
  searchEnabled?: boolean
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

const SKILLS_TOOLS = [
  'Available tools this turn (call them when they match):',
  '- Clock/calendar: get_date, get_now, calendar_math.',
  '- Math/units: calc, convert_units.',
  '- Weather: get_weather (Open-Meteo).',
  '- Web page: fetch_url (public https only).',
  '- JyutTranslate: jyut_plan_limits, jyut_phrase_lookup (en↔yue offline only), jyut_learn_hint.',
  '- Image (when enabled): generate_image (Gemini by default) — then paste the returned markdown into your reply.',
  '- Generation MCPs (when enabled): Higgsfield / Adobe / Cursor tools are namespaced mcp__<id>__… — prefer them for video or multi-step creative work; include any returned image markdown in your reply.',
  'Do not invent JyutTranslate plan numbers — call jyut_plan_limits.',
  'For Cantonese/Jyutping phrase help, try jyut_phrase_lookup first; if miss, answer normally and suggest Solo translate in the app.',
].join('\n')

const SKILLS_WEB = [
  'Web tools this turn (server-side; the host runs them):',
  '- deepseek_web_search — search the live web (with DeepThink on, deep thinking search).',
  '- deepseek_read_url — read links the user pasted.',
  'Prefer web tools for news, prices, and facts that may have changed after your cutoff.',
  'Critical: when the user needs live/web info, CALL deepseek_web_search (or deepseek_read_url) in this turn.',
  'Never end the turn with only "I\'ll search…" / "Let me search…" — that leaves the user with an empty promise.',
  'Put search intent in tool calls, not in a finished answer that never searched.',
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

/** Compact plan snapshot embedded when tools are unavailable (Search path). */
export function formatPlanSnapshot(): string {
  return [
    'Plan snapshot (grounded; do not invent other numbers):',
    `- Guest trial: ${env.guestLiveMinutes} live min/mo, ${env.guestCameraScans} cam scans/mo; Documents need sign-in.`,
    `- Free: ${env.freeLiveMinutes} live min, ${env.freeCameraScans} cam scans, ${env.freeDocsPages} doc pages; DeepSeek Chat locked.`,
    `- Family: ${env.familyLiveMinutes} live min, ${env.familyCameraScans} cam scans, ${env.familyDocsPages} doc pages, chat ${env.familyChatTurns}/mo, 4 seats.`,
    `- Business: ${env.businessLiveMinutes} live min, cam/docs unlimited, chat ${env.businessChatTurns === 0 ? 'unlimited' : env.businessChatTurns + '/mo'}, 10 seats.`,
  ].join('\n')
}

/**
 * Full system prompt for a chat turn.
 * Includes temporal grounding so "what day is today?" is answerable without search.
 */
export function buildDeepseekChatSystem(ctx: DeepseekChatPromptContext = {}): string {
  const parts = [BASE, FRESHNESS, formatTemporalBlock(ctx), SKILLS_TOOLS]
  // Only advertise server web tools when the request will actually declare them.
  if (ctx.searchEnabled && /deepseek/i.test(`${env.openaiBaseUrl} ${env.openaiModel} ${env.chatModel}`)) {
    parts.push(SKILLS_WEB)
  }
  // Legacy search-only callers still get a grounded plan snapshot.
  if (ctx.mode === 'search' && !ctx.searchEnabled) parts.push(formatPlanSnapshot())
  if (ctx.plan) parts.push(`Signed-in plan context: ${ctx.plan}.`)
  const primary = String(ctx.primaryLang || '').trim().toLowerCase()
  if (primary) {
    parts.push(
      `User primary language preference: ${primary}. Prefer this language for answers when the user does not specify another.`,
    )
  }
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
