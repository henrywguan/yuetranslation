/**
 * Server-side tools for DeepSeek Chat Completions (no MCP).
 * Keep executors offline / free APIs — Open-Meteo weather, no DeepSeek billing inside tools.
 */
import { dictionaryTranslate } from './canto/dictionary.js'
import { env } from './env.js'
import { resolveTimeZone, type DeepseekChatPromptContext } from './deepseekChatPrompt.js'

export type ChatToolContext = DeepseekChatPromptContext & {
  signal?: AbortSignal
}

type OpenAiTool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export const DEEPSEEK_CHAT_TOOLS: OpenAiTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_date',
      description: 'Get the current calendar date (YYYY-MM-DD) in the user timezone or UTC.',
      parameters: {
        type: 'object',
        properties: {
          timeZone: { type: 'string', description: 'IANA timezone; defaults to user timezone.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_now',
      description: 'Get a rich snapshot of the current moment (ISO, weekday, local wall clock).',
      parameters: {
        type: 'object',
        properties: {
          timeZone: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_math',
      description:
        'Date arithmetic: add days/weeks/months, or weekday for a YYYY-MM-DD. Prefer this over mental date math.',
      parameters: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: ['add', 'weekday'] },
          date: { type: 'string', description: 'YYYY-MM-DD or ISO; default today' },
          amount: { type: 'number', description: 'For add: how many units' },
          unit: { type: 'string', enum: ['days', 'weeks', 'months', 'years'] },
          timeZone: { type: 'string' },
        },
        required: ['op'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calc',
      description: 'Evaluate a basic arithmetic expression (+ - * / % parentheses, decimals).',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string' },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'convert_units',
      description: 'Convert between common units (temperature, length, mass, volume).',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number' },
          from: { type: 'string' },
          to: { type: 'string' },
        },
        required: ['value', 'from', 'to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Current weather + short forecast for a city via Open-Meteo (no API key).',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name, e.g. San Francisco' },
          date: { type: 'string', description: 'Optional YYYY-MM-DD (defaults today)' },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Fetch a public https URL and return truncated plain text (max ~12k chars).',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'jyut_plan_limits',
      description: 'Return grounded JyutTranslate plan limits (live, cam, docs, chat turns).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'jyut_phrase_lookup',
      description:
        'Offline JyutTranslate phrase memory lookup (en↔yue and curated langs). Returns null if unknown.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          sourceLang: {
            type: 'string',
            description: 'Source lang code, e.g. en or yue',
          },
          targetLang: {
            type: 'string',
            description: 'Target lang code, e.g. yue or en',
          },
        },
        required: ['text', 'sourceLang', 'targetLang'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'jyut_learn_hint',
      description: 'How to open Harbor Quest / Learn (#/learn) for Jyutping practice.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

function ymdInZone(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${y}-${m}-${day}`
}

function weekdayInZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(d)
}

/** Safe arithmetic — digits, operators, parentheses, decimals only. */
export function safeCalc(expression: string): number {
  const expr = expression.replace(/\s+/g, '')
  if (!expr || expr.length > 200) throw new Error('Expression too long or empty.')
  if (!/^[\d+\-*/%().eE]+$/.test(expr)) throw new Error('Unsupported characters in expression.')
  // eslint-disable-next-line no-new-func -- intentionally constrained charset above
  const fn = new Function(`"use strict"; return (${expr});`)
  const value = fn()
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Non-finite result.')
  return value
}

const UNIT_TO_SI: Record<string, { dim: string; toSi: (n: number) => number; fromSi: (n: number) => number }> = {
  c: { dim: 'temp', toSi: (n) => n, fromSi: (n) => n },
  f: { dim: 'temp', toSi: (n) => ((n - 32) * 5) / 9, fromSi: (n) => (n * 9) / 5 + 32 },
  k: { dim: 'temp', toSi: (n) => n - 273.15, fromSi: (n) => n + 273.15 },
  m: { dim: 'len', toSi: (n) => n, fromSi: (n) => n },
  km: { dim: 'len', toSi: (n) => n * 1000, fromSi: (n) => n / 1000 },
  cm: { dim: 'len', toSi: (n) => n / 100, fromSi: (n) => n * 100 },
  mm: { dim: 'len', toSi: (n) => n / 1000, fromSi: (n) => n * 1000 },
  mi: { dim: 'len', toSi: (n) => n * 1609.344, fromSi: (n) => n / 1609.344 },
  ft: { dim: 'len', toSi: (n) => n * 0.3048, fromSi: (n) => n / 0.3048 },
  in: { dim: 'len', toSi: (n) => n * 0.0254, fromSi: (n) => n / 0.0254 },
  kg: { dim: 'mass', toSi: (n) => n, fromSi: (n) => n },
  g: { dim: 'mass', toSi: (n) => n / 1000, fromSi: (n) => n * 1000 },
  lb: { dim: 'mass', toSi: (n) => n * 0.45359237, fromSi: (n) => n / 0.45359237 },
  oz: { dim: 'mass', toSi: (n) => n * 0.028349523125, fromSi: (n) => n / 0.028349523125 },
  l: { dim: 'vol', toSi: (n) => n, fromSi: (n) => n },
  ml: { dim: 'vol', toSi: (n) => n / 1000, fromSi: (n) => n * 1000 },
  gal: { dim: 'vol', toSi: (n) => n * 3.785411784, fromSi: (n) => n / 3.785411784 },
}

export function convertUnits(value: number, fromRaw: string, toRaw: string): number {
  const from = fromRaw.trim().toLowerCase()
  const to = toRaw.trim().toLowerCase()
  const a = UNIT_TO_SI[from]
  const b = UNIT_TO_SI[to]
  if (!a || !b) throw new Error(`Unsupported units: ${fromRaw} → ${toRaw}`)
  if (a.dim !== b.dim) throw new Error('Dimension mismatch.')
  return b.fromSi(a.toSi(value))
}

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true
  if (h === '0.0.0.0' || h === '::1') return true
  // Literal IPv4
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
  }
  return false
}

export async function fetchPublicHttpsText(urlRaw: string, signal?: AbortSignal): Promise<string> {
  let url: URL
  try {
    url = new URL(urlRaw)
  } catch {
    throw new Error('Invalid URL.')
  }
  if (url.protocol !== 'https:') throw new Error('Only https URLs are allowed.')
  if (isPrivateHostname(url.hostname)) throw new Error('Private/local hosts are blocked.')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8_000)
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { Accept: 'text/html,text/plain,application/json;q=0.9,*/*;q=0.1' },
    })
    if (!res.ok) throw new Error(`Fetch failed (${res.status}).`)
    const ctype = String(res.headers.get('content-type') || '')
    if (/image\/|audio\/|video\/|octet-stream/i.test(ctype)) {
      throw new Error('Binary content not supported.')
    }
    const text = await res.text()
    const stripped = text
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return stripped.slice(0, 12_000)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

async function getWeather(location: string, date: string | undefined, signal?: AbortSignal) {
  const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
  geoUrl.searchParams.set('name', location)
  geoUrl.searchParams.set('count', '1')
  geoUrl.searchParams.set('language', 'en')
  geoUrl.searchParams.set('format', 'json')
  const geoRes = await fetch(geoUrl, { signal })
  if (!geoRes.ok) throw new Error('Geocoding failed.')
  const geo = (await geoRes.json()) as {
    results?: Array<{ name: string; latitude: number; longitude: number; country?: string; timezone?: string }>
  }
  const hit = geo.results?.[0]
  if (!hit) throw new Error(`Location not found: ${location}`)

  const wx = new URL('https://api.open-meteo.com/v1/forecast')
  wx.searchParams.set('latitude', String(hit.latitude))
  wx.searchParams.set('longitude', String(hit.longitude))
  wx.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m')
  wx.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min')
  wx.searchParams.set('timezone', hit.timezone || 'auto')
  if (date) {
    wx.searchParams.set('start_date', date)
    wx.searchParams.set('end_date', date)
  }
  const wxRes = await fetch(wx, { signal })
  if (!wxRes.ok) throw new Error('Weather fetch failed.')
  const body = await wxRes.json()
  return {
    place: `${hit.name}${hit.country ? `, ${hit.country}` : ''}`,
    timezone: hit.timezone,
    forecast: body,
  }
}

function planLimitsPayload() {
  return {
    free: {
      liveMinutes: env.freeLiveMinutes,
      cameraScans: env.freeCameraScans,
      docsPages: env.freeDocsPages,
      chat: 'locked — Family/Business',
    },
    family: {
      liveMinutes: env.familyLiveMinutes,
      cameraScans: env.familyCameraScans,
      docsPages: env.familyDocsPages,
      chatTurnsPerMonth: env.familyChatTurns,
      seats: 4,
    },
    business: {
      liveMinutes: env.businessLiveMinutes,
      cameraScans: 'unlimited',
      docsPages: 'unlimited',
      chatTurnsPerMonth: env.businessChatTurns === 0 ? 'unlimited' : env.businessChatTurns,
      seats: 10,
    },
    note: 'Canonical details: docs/entitlements.md. Guests have separate live/cam trials.',
  }
}

function parseDateInput(raw: string | undefined, timeZone: string, now: Date): Date {
  if (!raw || !raw.trim()) return now
  const t = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    // Interpret as local calendar date in zone → approximate via UTC noon trick
    return new Date(`${t}T12:00:00.000Z`)
  }
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) throw new Error(`Bad date: ${raw}`)
  void timeZone
  return d
}

export async function executeDeepseekChatTool(
  name: string,
  argsJson: string,
  ctx: ChatToolContext,
): Promise<string> {
  let args: Record<string, unknown> = {}
  try {
    args = argsJson ? (JSON.parse(argsJson) as Record<string, unknown>) : {}
  } catch {
    return JSON.stringify({ error: 'Invalid tool arguments JSON.' })
  }

  const now = ctx.now ?? new Date()
  const timeZone = resolveTimeZone(
    typeof args.timeZone === 'string' ? args.timeZone : ctx.timeZone,
  )

  try {
    switch (name) {
      case 'get_date':
        return JSON.stringify({
          date: ymdInZone(now, timeZone),
          weekday: weekdayInZone(now, timeZone),
          timeZone,
        })
      case 'get_now':
        return JSON.stringify({
          utc: now.toISOString(),
          date: ymdInZone(now, timeZone),
          weekday: weekdayInZone(now, timeZone),
          timeZone,
          local: new Intl.DateTimeFormat('en-US', {
            timeZone,
            dateStyle: 'full',
            timeStyle: 'medium',
            hour12: false,
          }).format(now),
        })
      case 'calendar_math': {
        const op = String(args.op || '')
        const base = parseDateInput(typeof args.date === 'string' ? args.date : undefined, timeZone, now)
        if (op === 'weekday') {
          return JSON.stringify({
            date: ymdInZone(base, timeZone),
            weekday: weekdayInZone(base, timeZone),
          })
        }
        if (op !== 'add') throw new Error('Unknown calendar_math op.')
        const amount = Number(args.amount)
        if (!Number.isFinite(amount)) throw new Error('amount required')
        const unit = String(args.unit || 'days')
        const d = new Date(base.getTime())
        if (unit === 'days') d.setUTCDate(d.getUTCDate() + amount)
        else if (unit === 'weeks') d.setUTCDate(d.getUTCDate() + amount * 7)
        else if (unit === 'months') d.setUTCMonth(d.getUTCMonth() + amount)
        else if (unit === 'years') d.setUTCFullYear(d.getUTCFullYear() + amount)
        else throw new Error('Bad unit')
        return JSON.stringify({
          resultDate: ymdInZone(d, timeZone),
          weekday: weekdayInZone(d, timeZone),
          timeZone,
        })
      }
      case 'calc': {
        const expression = String(args.expression || '')
        return JSON.stringify({ expression, result: safeCalc(expression) })
      }
      case 'convert_units': {
        const value = Number(args.value)
        const from = String(args.from || '')
        const to = String(args.to || '')
        return JSON.stringify({
          value,
          from,
          to,
          result: convertUnits(value, from, to),
        })
      }
      case 'get_weather': {
        const location = String(args.location || '').trim()
        if (!location) throw new Error('location required')
        const date = typeof args.date === 'string' ? args.date : undefined
        const wx = await getWeather(location, date, ctx.signal)
        return JSON.stringify(wx).slice(0, 8_000)
      }
      case 'fetch_url': {
        const url = String(args.url || '')
        const text = await fetchPublicHttpsText(url, ctx.signal)
        return JSON.stringify({ url, text })
      }
      case 'jyut_plan_limits':
        return JSON.stringify(planLimitsPayload())
      case 'jyut_phrase_lookup': {
        const text = String(args.text || '').trim()
        const sourceLang = String(args.sourceLang || 'en') as 'en' | 'yue'
        const targetLang = String(args.targetLang || 'yue') as 'en' | 'yue'
        if (!text) throw new Error('text required')
        // Only support common en/yue offline path for safety/type narrowness.
        const hit = dictionaryTranslate({
          sourceLang: sourceLang === 'yue' ? 'yue' : 'en',
          targetLang: targetLang === 'en' ? 'en' : 'yue',
          source: text,
          wantAlternatives: true,
        })
        if (!hit) return JSON.stringify({ found: false, text })
        return JSON.stringify({
          found: true,
          text: hit.text,
          romanization: hit.romanization,
          alternatives: hit.alternatives,
        })
      }
      case 'jyut_learn_hint':
        return JSON.stringify({
          route: '#/learn',
          name: 'Harbor Quest',
          access: 'Signed-in Free+ from Account Hub (Beta) or open #/learn directly.',
          note: 'Jyutping voyage paced to Open Cantonese Pronunciation Guide.',
        })
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` })
    }
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : 'Tool failed' })
  }
}
