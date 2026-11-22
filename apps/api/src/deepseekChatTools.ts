/**
 * Server-side tools for DeepSeek Chat Completions (no MCP).
 * Keep executors offline / free APIs — Open-Meteo weather, no DeepSeek billing inside tools.
 */
import dns from 'node:dns/promises'
import { dictionaryTranslate } from './canto/dictionary.js'
import { env } from './env.js'
import { resolveTimeZone, type DeepseekChatPromptContext } from './deepseekChatPrompt.js'
import { randomUUID } from 'node:crypto'
import { generateChatImage } from './deepseekChatImage.js'
import { callMcpTool, extractImageUrlsFromMcpResult, parseMcpToolName } from './deepseekChatMcp.js'
import type { ChatPluginCredentials } from './deepseekChatPluginKeys.js'
import {
  workspaceListJson,
  workspaceReadJson,
  workspaceWrite,
  type ChatWorkspaceStore,
} from './deepseekChatWorkspace.js'
import { getSandboxSession } from './chatSandbox.js'
import { execSandbox, listSandboxFs, readSandboxFs, writeSandboxFs } from './chatSandboxService.js'
import {
  GithubNotConfiguredError,
  githubConfigured,
  openGithubPullRequest,
  parseGithubRepo,
} from './chatGithub.js'
import {
  projectCloseAgent,
  projectCreateAgent,
  projectListJson,
  projectMessageAgent,
  projectSetStatus,
  projectUpdateMemory,
  type ChatProjectStore,
  type ProjectAction,
} from './deepseekChatProject.js'
import {
  CHAT_DEEP_AVATAR_SHOWCASE,
  isChatDeepAvatarMoodId,
  normalizeChatDeepAvatarMoodId,
} from './chatDeepAvatarPersona.js'

export type ChatToolContext = DeepseekChatPromptContext & {
  signal?: AbortSignal
  /** Optional sink so the harness can emit SSE image events. */
  onImage?: (image: { url: string; prompt: string; id: string }) => void
  /** Companion avatar play / react — client paints GIF + optional fullscreen. */
  onAvatar?: (event: { action: 'list' | 'play' | 'react'; mood?: string }) => void
  /** Per-user BYOK secrets for image + MCP presets. */
  pluginCreds?: ChatPluginCredentials
  /** Mutable thread workspace when Harness mode is on. */
  workspace?: ChatWorkspaceStore
  /** Fired after workspace_write so the harness can SSE the update. */
  onWorkspaceWrite?: (file: {
    id: string
    path: string
    mime?: string
    text?: string
    updatedAt: number
  }) => void
  /** Signed-in user id — required for sandbox_* tools. */
  userId?: string
  /** Attached Chat Inbox sandbox session id. */
  sandboxSessionId?: string
  /** Overseer Project store (turn-local) when inboxRole=overseer. */
  project?: ChatProjectStore
  /** Fired when project_* tools enqueue client-side actions. */
  onProjectActions?: (actions: ProjectAction[]) => void
  /** Fired for sandbox / GitHub tool results so the client can paint Diffs + Runs panes. */
  onSandboxActivity?: (activity: {
    kind: 'diff' | 'run' | 'pr'
    path?: string
    text?: string
    argv?: string[]
    stdout?: string
    stderr?: string
    exitCode?: number
    ok?: boolean
    reviewUrl?: string
    source?: 'sandbox' | 'workspace' | 'git'
    at?: number
  }) => void
}

/** Tools that mutate files / sandboxes / projects / generation — blocked in Ask & Plan. */
export const DEEPSEEK_CHAT_MUTATING_TOOL_NAMES = new Set([
  'workspace_write',
  'sandbox_write',
  'sandbox_exec',
  'github_open_pr',
  'project_create_agent',
  'project_message_agent',
  'project_close_agent',
  'project_update_memory',
  'generate_image',
])

export function isMutatingChatTool(name: string): boolean {
  const n = String(name || '')
  if (DEEPSEEK_CHAT_MUTATING_TOOL_NAMES.has(n)) return true
  // MCP generation plugins are mutating for Ask/Plan.
  if (n.startsWith('mcp__')) return true
  return false
}

export function filterToolsForChatMode(
  tools: unknown[],
  chatMode?: 'agent' | 'ask' | 'plan',
): unknown[] {
  if (!chatMode || chatMode === 'agent') return tools
  return tools.filter((t) => {
    const name = (t as { function?: { name?: string } })?.function?.name
    if (!name) return true
    return !isMutatingChatTool(name)
  })
}

type OpenAiTool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/** Overseer orchestration — declared when inboxRole=overseer + projectId attached. */
export const DEEPSEEK_CHAT_PROJECT_TOOLS: OpenAiTool[] = [
  {
    type: 'function',
    function: {
      name: 'project_list_agents',
      description:
        'List agents in this Project (Overseer + workers) with status for Inbox tiles.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'project_create_agent',
      description:
        'Create a worker agent in this Project and start it. Always include message (first task prompt) so the client runs that worker chat immediately — creating without message leaves a silent queued row.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short worker label' },
          message: {
            type: 'string',
            description: 'First task prompt for the worker (required for auto-start)',
          },
        },
        required: ['title', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'project_message_agent',
      description:
        'Send a task or follow-up to an existing worker (create/resume that worker turn). Prefer this over asking the user to spawn manually.',
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['agentId', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'project_set_status',
      description:
        'Update an agent status so Inbox tiles stay accurate (working / needs_attention / in_review / done / canceled / queued / idle). Prefer project_close_agent when finishing a worker so context is compacted.',
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              'queued',
              'working',
              'needs_attention',
              'in_review',
              'done',
              'canceled',
              'idle',
            ],
          },
          reviewUrl: { type: 'string', description: 'Optional PR / review URL for in_review' },
        },
        required: ['agentId', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'project_close_agent',
      description:
        'Close a finished or irrelevant worker: set done/canceled, archive its thread, and compact its transcript into a short summary (Project memory + Tasks). Prefer this over leaving stale working/idle workers.',
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          status: {
            type: 'string',
            enum: ['done', 'canceled'],
            description: 'done = finished successfully; canceled = no longer relevant',
          },
          summary: {
            type: 'string',
            description:
              'Crisp compact summary of what the worker accomplished or why it was canceled (required for later context).',
          },
        },
        required: ['agentId', 'status', 'summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'project_update_memory',
      description: 'Update shared Project memory visible to Overseer and workers on later turns.',
      parameters: {
        type: 'object',
        properties: {
          memory: { type: 'string' },
        },
        required: ['memory'],
      },
    },
  },
]

/** Coding sandbox tools — declared when a sandboxSessionId is attached (Phase C). */
export const DEEPSEEK_CHAT_SANDBOX_TOOLS: OpenAiTool[] = [
  {
    type: 'function',
    function: {
      name: 'sandbox_list',
      description: 'List files in the attached internal sandbox (coding VM / stub temp dir).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative directory, default .' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sandbox_read',
      description: 'Read a text file from the attached sandbox.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sandbox_write',
      description: 'Write a text file in the attached sandbox (≤200KB).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['path', 'text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sandbox_exec',
      description:
        'Run an allowlisted command in the sandbox (argv array, no shell). Stub driver: node/npm/git/python3/…',
      parameters: {
        type: 'object',
        properties: {
          argv: {
            type: 'array',
            items: { type: 'string' },
            description: 'e.g. ["node","-e","console.log(1)"]',
          },
        },
        required: ['argv'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'github_open_pr',
      description:
        'Open a GitHub pull request on a repo the JyutTranslate GitHub App can access. Returns html_url for In Review.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'owner/name' },
          title: { type: 'string' },
          head: { type: 'string', description: 'branch with commits' },
          base: { type: 'string', description: 'default main' },
          body: { type: 'string' },
        },
        required: ['repo', 'title', 'head'],
      },
    },
  },
]

/** Tools only declared when the client sends harness: true. */
export const DEEPSEEK_CHAT_WORKSPACE_TOOLS: OpenAiTool[] = [
  {
    type: 'function',
    function: {
      name: 'workspace_list',
      description:
        'List files in the thread Workspace (Harness mode). Prefer writing durable notes/code here instead of only chat markdown.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'workspace_read',
      description: 'Read a Workspace file by path (text contents).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Workspace-relative path, e.g. notes/summary.md' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'workspace_write',
      description:
        'Create or overwrite a Workspace text file (≤100KB). Use for research notes, outlines, code, OCR dumps.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          text: { type: 'string' },
          mime: { type: 'string', description: 'Optional mime, default text/plain' },
        },
        required: ['path', 'text'],
      },
    },
  },
]

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
        'Offline JyutTranslate phrase memory for en↔yue only. Other language pairs are not supported here — say so and suggest Solo translate.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          sourceLang: {
            type: 'string',
            enum: ['en', 'yue'],
            description: 'Must be en or yue',
          },
          targetLang: {
            type: 'string',
            enum: ['en', 'yue'],
            description: 'Must be en or yue',
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
  {
    type: 'function',
    function: {
      name: 'avatar_list',
      description:
        'List the companion avatar animation / emotion catalog (ids, labels, blurbs). Use when the user asks what animations or emotions you can show.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'avatar_play',
      description:
        'Play a companion animation fullscreen with sound (user-requested demo). Prefer asking which mood they want after avatar_list.',
      parameters: {
        type: 'object',
        properties: {
          mood: {
            type: 'string',
            description: `One of: ${CHAT_DEEP_AVATAR_SHOWCASE.map((e) => e.id).join(', ')}`,
          },
        },
        required: ['mood'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'avatar_react',
      description:
        'Set the companion portrait mood for this reply (soft in-frame, or fullscreen for high-energy moods). Call once near the end of emotionally clear answers.',
      parameters: {
        type: 'object',
        properties: {
          mood: {
            type: 'string',
            description: `One of: ${CHAT_DEEP_AVATAR_SHOWCASE.map((e) => e.id).join(', ')}`,
          },
        },
        required: ['mood'],
      },
    },
  },
]

/** Built-in plugin tools are merged at request time — see deepseekChatMcp / deepseekChatImage. */

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

function isPrivateIp(ip: string): boolean {
  const h = ip.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === '::1' || h === '0.0.0.0') return true
  if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h)
  if (!m) return false
  const a = Number(m[1])
  const b = Number(m[2])
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true
  if (h === '0.0.0.0' || h === '::1') return true
  return isPrivateIp(h)
}

const FETCH_MAX_BYTES = 256_000
const FETCH_MAX_REDIRECTS = 3

function assertPublicHttpsUrl(url: URL) {
  if (url.protocol !== 'https:') throw new Error('Only https URLs are allowed.')
  if (isPrivateHostname(url.hostname)) throw new Error('Private/local hosts are blocked.')
}

async function assertPublicHttpsResolved(url: URL) {
  assertPublicHttpsUrl(url)
  let lookup: { address: string; family: number }
  try {
    lookup = await dns.lookup(url.hostname)
  } catch {
    throw new Error('DNS lookup failed.')
  }
  if (isPrivateIp(lookup.address)) {
    throw new Error('Resolved address is private/blocked.')
  }
}

async function readResponseTextCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return ''
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined)
      throw new Error('Response too large.')
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    merged.set(c, offset)
    offset += c.byteLength
  }
  return new TextDecoder().decode(merged)
}

export async function fetchPublicHttpsText(urlRaw: string, signal?: AbortSignal): Promise<string> {
  let url: URL
  try {
    url = new URL(urlRaw)
  } catch {
    throw new Error('Invalid URL.')
  }
  await assertPublicHttpsResolved(url)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8_000)
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    // Manual redirects so each hop re-checks private/local hosts (no SSRF via 302).
    let res: Response | null = null
    for (let hop = 0; hop <= FETCH_MAX_REDIRECTS; hop += 1) {
      await assertPublicHttpsResolved(url)
      res = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: ctrl.signal,
        headers: { Accept: 'text/html,text/plain,application/json;q=0.9,*/*;q=0.1' },
      })
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (!loc) throw new Error('Redirect without Location.')
        url = new URL(loc, url)
        continue
      }
      break
    }
    if (!res) throw new Error('Fetch failed.')
    if (res.status >= 300 && res.status < 400) throw new Error('Too many redirects.')
    if (!res.ok) throw new Error(`Fetch failed (${res.status}).`)
    const ctype = String(res.headers.get('content-type') || '')
    if (/image\/|audio\/|video\/|octet-stream/i.test(ctype)) {
      throw new Error('Binary content not supported.')
    }
    const text = await readResponseTextCapped(res, FETCH_MAX_BYTES)
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
    guest: {
      liveMinutes: env.guestLiveMinutes,
      cameraScans: env.guestCameraScans,
      docs: 'sign-in required',
      chat: 'locked',
    },
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
    note: 'Canonical details: docs/entitlements.md.',
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

/** Per-tool deadline so a hung Image / MCP / fetch cannot freeze the SSE turn. */
export function deepseekChatToolTimeoutMs(name: string): number {
  const n = String(name || '')
  if (n === 'generate_image') return 95_000
  if (n.startsWith('mcp__')) return 60_000
  if (n === 'sandbox_exec' || n === 'github_open_pr') return 120_000
  if (n === 'fetch_url') return 20_000
  return 45_000
}

/**
 * Run a tool with AbortSignal deadline. Timeout returns a tool-error JSON string
 * so the harness can continue (never hang the chat spinner forever).
 */
export async function executeDeepseekChatToolWithTimeout(
  name: string,
  argsJson: string,
  ctx: ChatToolContext,
  ms = deepseekChatToolTimeoutMs(name),
): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  if (typeof timer.unref === 'function') timer.unref()
  const onParent = () => ctrl.abort()
  ctx.signal?.addEventListener('abort', onParent)
  try {
    return await Promise.race([
      executeDeepseekChatTool(name, argsJson, { ...ctx, signal: ctrl.signal }),
      new Promise<string>((resolve) => {
        ctrl.signal.addEventListener(
          'abort',
          () => {
            if (ctx.signal?.aborted) {
              resolve(JSON.stringify({ error: 'Aborted', code: 'aborted' }))
              return
            }
            resolve(
              JSON.stringify({
                error: `Tool ${name} timed out after ${Math.round(ms / 1000)}s.`,
                code: 'tool_timeout',
              }),
            )
          },
          { once: true },
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
    ctx.signal?.removeEventListener('abort', onParent)
  }
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

  const chatMode = ctx.chatMode === 'ask' || ctx.chatMode === 'plan' ? ctx.chatMode : 'agent'
  if (chatMode !== 'agent' && isMutatingChatTool(name)) {
    return JSON.stringify({
      error: `${name} is unavailable in ${chatMode === 'ask' ? 'Ask' : 'Plan'} mode (read-only). Switch to Agent or click Build.`,
      code: 'chat_mode_readonly',
    })
  }

  const now = ctx.now ?? new Date()
  const timeZone = resolveTimeZone(
    typeof args.timeZone === 'string' ? args.timeZone : ctx.timeZone,
  )

  try {
    switch (name) {
      case 'workspace_list': {
        if (!ctx.workspace) {
          return JSON.stringify({ error: 'Workspace unavailable (enable Harness mode).' })
        }
        return workspaceListJson(ctx.workspace)
      }
      case 'workspace_read': {
        if (!ctx.workspace) {
          return JSON.stringify({ error: 'Workspace unavailable (enable Harness mode).' })
        }
        return workspaceReadJson(ctx.workspace, String(args.path || ''))
      }
      case 'workspace_write': {
        if (!ctx.workspace) {
          return JSON.stringify({ error: 'Workspace unavailable (enable Harness mode).' })
        }
        const result = workspaceWrite(
          ctx.workspace,
          String(args.path || ''),
          String(args.text ?? ''),
          typeof args.mime === 'string' ? args.mime : undefined,
        )
        if (!result.ok) return JSON.stringify({ error: result.error })
        ctx.onWorkspaceWrite?.(result.file)
        ctx.onSandboxActivity?.({
          kind: 'diff',
          path: result.file.path,
          text: result.file.text,
          source: 'workspace',
          at: Date.now(),
        })
        return JSON.stringify({
          ok: true,
          path: result.file.path,
          bytes: result.file.text?.length ?? 0,
          updatedAt: result.file.updatedAt,
        })
      }
      case 'project_list_agents': {
        if (!ctx.project) {
          return JSON.stringify({
            error: 'No Project attached. Open a Project Overseer chat from the Inbox.',
          })
        }
        return projectListJson(ctx.project)
      }
      case 'project_create_agent': {
        if (!ctx.project) {
          return JSON.stringify({
            error: 'No Project attached. Open a Project Overseer chat from the Inbox.',
          })
        }
        const created = projectCreateAgent(
          ctx.project,
          String(args.title || ''),
          typeof args.message === 'string' ? args.message : undefined,
        )
        if (!created.ok) return JSON.stringify({ error: created.error })
        ctx.onProjectActions?.([created.action])
        return JSON.stringify({
          ok: true,
          agentId: created.agentId,
          title: created.action.title,
          status: created.action.status,
          queuedMessage: Boolean(created.action.message),
        })
      }
      case 'project_message_agent': {
        if (!ctx.project) {
          return JSON.stringify({
            error: 'No Project attached. Open a Project Overseer chat from the Inbox.',
          })
        }
        const messaged = projectMessageAgent(
          ctx.project,
          String(args.agentId || ''),
          String(args.message || ''),
        )
        if (!messaged.ok) return JSON.stringify({ error: messaged.error })
        ctx.onProjectActions?.([messaged.action])
        return JSON.stringify({ ok: true, agentId: messaged.action.agentId, queued: true })
      }
      case 'project_set_status': {
        if (!ctx.project) {
          return JSON.stringify({
            error: 'No Project attached. Open a Project Overseer chat from the Inbox.',
          })
        }
        const set = projectSetStatus(
          ctx.project,
          String(args.agentId || ''),
          String(args.status || ''),
          typeof args.reviewUrl === 'string' ? args.reviewUrl : undefined,
        )
        if (!set.ok) return JSON.stringify({ error: set.error })
        ctx.onProjectActions?.([set.action])
        return JSON.stringify({
          ok: true,
          agentId: set.action.agentId,
          status: set.action.status,
          reviewUrl: set.action.reviewUrl,
        })
      }
      case 'project_close_agent': {
        if (!ctx.project) {
          return JSON.stringify({
            error: 'No Project attached. Open a Project Overseer chat from the Inbox.',
          })
        }
        const closed = projectCloseAgent(
          ctx.project,
          String(args.agentId || ''),
          String(args.status || ''),
          String(args.summary || ''),
        )
        if (!closed.ok) return JSON.stringify({ error: closed.error })
        ctx.onProjectActions?.(closed.actions)
        return JSON.stringify({
          ok: true,
          agentId: String(args.agentId || ''),
          status: String(args.status || ''),
          compacted: true,
          archived: true,
        })
      }
      case 'project_update_memory': {
        if (!ctx.project) {
          return JSON.stringify({
            error: 'No Project attached. Open a Project Overseer chat from the Inbox.',
          })
        }
        const mem = projectUpdateMemory(ctx.project, String(args.memory ?? ''))
        ctx.onProjectActions?.([mem.action])
        return JSON.stringify({ ok: true, memoryChars: mem.action.memory.length })
      }
      case 'sandbox_list':
      case 'sandbox_read':
      case 'sandbox_write':
      case 'sandbox_exec': {
        if (!ctx.userId || !ctx.sandboxSessionId) {
          return JSON.stringify({
            error: 'No sandbox attached. Create an Internal sandbox in Inbox → Workspaces.',
          })
        }
        const session = getSandboxSession(ctx.sandboxSessionId, ctx.userId)
        if (!session || session.status === 'destroyed') {
          return JSON.stringify({ error: 'Sandbox session missing or destroyed.' })
        }
        if (name === 'sandbox_list') {
          const entries = await listSandboxFs(
            session,
            typeof args.path === 'string' ? args.path : '.',
          )
          return JSON.stringify({ entries, driver: session.driver })
        }
        if (name === 'sandbox_read') {
          const text = await readSandboxFs(session, String(args.path || ''))
          return JSON.stringify({ path: args.path, text, driver: session.driver })
        }
        if (name === 'sandbox_write') {
          const path = String(args.path || '')
          const text = String(args.text ?? '')
          const written = await writeSandboxFs(session, path, text)
          ctx.onSandboxActivity?.({
            kind: 'diff',
            path: written.path || path,
            text,
            source: 'sandbox',
            at: Date.now(),
          })
          return JSON.stringify({ ok: true, ...written, driver: session.driver })
        }
        const argv = Array.isArray(args.argv)
          ? args.argv.map((a) => String(a)).slice(0, 32)
          : []
        const result = await execSandbox(session, argv)
        ctx.onSandboxActivity?.({
          kind: 'run',
          argv,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.code ?? undefined,
          ok: result.ok,
          at: Date.now(),
        })
        return JSON.stringify(result)
      }
      case 'github_open_pr': {
        if (!githubConfigured(ctx.pluginCreds)) {
          return JSON.stringify({
            error: new GithubNotConfiguredError().message,
            code: 'github_not_configured',
            fixability: 'NEEDS_HUMAN',
          })
        }
        const parsed = parseGithubRepo(String(args.repo || ''))
        if (!parsed) return JSON.stringify({ error: 'repo must be owner/name' })
        const title = String(args.title || '').trim()
        const head = String(args.head || '').trim()
        if (!title || !head) return JSON.stringify({ error: 'title and head required' })
        try {
          const pr = await openGithubPullRequest({
            owner: parsed.owner,
            repo: parsed.repo,
            title,
            head,
            base: typeof args.base === 'string' ? args.base : undefined,
            body: typeof args.body === 'string' ? args.body : undefined,
            creds: ctx.pluginCreds,
          })
          if (pr?.htmlUrl) {
            ctx.onSandboxActivity?.({
              kind: 'pr',
              reviewUrl: pr.htmlUrl,
              at: Date.now(),
            })
          }
          return JSON.stringify({ ok: true, pr, inboxHint: 'Mark agent In Review with pr.htmlUrl' })
        } catch (err) {
          return JSON.stringify({
            error: err instanceof Error ? err.message : 'Open PR failed',
          })
        }
      }
      case 'avatar_list': {
        ctx.onAvatar?.({ action: 'list' })
        return JSON.stringify({
          ok: true,
          animations: CHAT_DEEP_AVATAR_SHOWCASE.map((e) => ({
            id: e.id,
            label: e.label,
            blurb: e.blurb,
            highEnergy: e.highEnergy,
          })),
          hint: 'Ask which mood to play, then call avatar_play.',
        })
      }
      case 'avatar_play': {
        if (!isChatDeepAvatarMoodId(args.mood)) {
          return JSON.stringify({
            error: `Unknown mood. Valid: ${CHAT_DEEP_AVATAR_SHOWCASE.map((e) => e.id).join(', ')}`,
          })
        }
        const mood = normalizeChatDeepAvatarMoodId(args.mood)
        ctx.onAvatar?.({ action: 'play', mood })
        return JSON.stringify({ ok: true, action: 'play', mood })
      }
      case 'avatar_react': {
        if (!isChatDeepAvatarMoodId(args.mood)) {
          return JSON.stringify({
            error: `Unknown mood. Valid: ${CHAT_DEEP_AVATAR_SHOWCASE.map((e) => e.id).join(', ')}`,
          })
        }
        const mood = normalizeChatDeepAvatarMoodId(args.mood)
        ctx.onAvatar?.({ action: 'react', mood })
        return JSON.stringify({ ok: true, action: 'react', mood })
      }
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
        const sourceLang = String(args.sourceLang || '')
        const targetLang = String(args.targetLang || '')
        if (!text) throw new Error('text required')
        if (
          (sourceLang !== 'en' && sourceLang !== 'yue') ||
          (targetLang !== 'en' && targetLang !== 'yue')
        ) {
          return JSON.stringify({
            found: false,
            error: 'jyut_phrase_lookup supports en↔yue only. Suggest Solo translate for other langs.',
            sourceLang,
            targetLang,
          })
        }
        const hit = dictionaryTranslate({
          sourceLang,
          targetLang,
          source: text,
          wantAlternatives: true,
        })
        if (!hit) return JSON.stringify({ found: false, text, sourceLang, targetLang })
        return JSON.stringify({
          found: true,
          text: hit.text,
          romanization: hit.romanization,
          alternatives: hit.alternatives,
          sourceLang,
          targetLang,
        })
      }
      case 'jyut_learn_hint':
        return JSON.stringify({
          route: '#/learn',
          name: 'Harbor Quest',
          access: 'Signed-in Free+ from Account Hub (Beta) or open #/learn directly.',
          note: 'Jyutping voyage paced to Open Cantonese Pronunciation Guide.',
        })
      case 'generate_image': {
        const prompt = String(args.prompt || '').trim()
        const sizeRaw = String(args.size || '1024x1024')
        const size =
          sizeRaw === '1024x1792' || sizeRaw === '1792x1024' ? sizeRaw : ('1024x1024' as const)
        const { markdown, image } = await generateChatImage(prompt, {
          signal: ctx.signal,
          size,
          pluginCreds: ctx.pluginCreds,
          apiKey: ctx.pluginCreds?.image,
          geminiApiKey: ctx.pluginCreds?.gemini,
        })
        ctx.onImage?.({ url: image.url, prompt: image.prompt, id: image.id })
        return JSON.stringify({
          ok: true,
          markdown,
          url: image.url,
          prompt: image.prompt,
          note: 'Include the markdown string in your assistant reply so the user sees the image.',
        })
      }
      default: {
        const mcp = parseMcpToolName(name)
        if (mcp) {
          const result = await callMcpTool(
            mcp.serverId,
            mcp.toolName,
            args,
            ctx.signal,
            ctx.pluginCreds,
          )
          for (const url of extractImageUrlsFromMcpResult(result)) {
            ctx.onImage?.({
              url,
              prompt: `${mcp.serverId}/${mcp.toolName}`,
              id: randomUUID(),
            })
          }
          return result
        }
        return JSON.stringify({ error: `Unknown tool: ${name}` })
      }
    }
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : 'Tool failed' })
  }
}
