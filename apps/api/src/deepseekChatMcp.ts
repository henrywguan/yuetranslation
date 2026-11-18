/**
 * Light MCP bridge for DeepSeek Chat:
 * - Built-in plugins (image generation)
 * - First-class generation MCP presets (Higgsfield, Adobe, Cursor-when-ready)
 * - Optional extra remote MCP servers via YUE_CHAT_MCP_SERVERS
 *
 * Tools are exposed as OpenAI function tools with namespaced names:
 *   mcp__<serverId>__<toolName>
 *
 * OAuth MCP hosts (Higgsfield / Adobe) need a Bearer token in env until we ship
 * per-user OAuth in #/chat. Paste a token from your MCP client session or API gateway.
 */
import { env } from './env.js'
import { chatImageConfiguredWith, chatImageProviderLabel } from './deepseekChatImage.js'
import { chatVideoConfigured } from './deepseekChatVideo.js'
import type { ChatPluginCredentials } from './deepseekChatPluginKeys.js'

export type ChatPluginKind = 'builtin' | 'mcp'

export type ChatPluginStatus = 'ready' | 'needs_token' | 'coming_soon'

export type ChatPluginInfo = {
  id: string
  name: string
  description: string
  kind: ChatPluginKind
  /** Default-on for Family chat when listed. */
  defaultEnabled?: boolean
  configured: boolean
  toolCount?: number
  /** Generation marketplace badge. */
  category?: 'generation' | 'general'
  auth?: 'none' | 'bearer' | 'oauth'
  status?: ChatPluginStatus
  /** Public MCP URL when known (safe to show). */
  url?: string
}

type McpServerConfig = {
  id: string
  name: string
  url: string
  headers?: Record<string, string>
  description?: string
  auth?: 'none' | 'bearer' | 'oauth'
  category?: 'generation' | 'general'
  /** False → list in catalog but do not call tools/list. */
  ready: boolean
  status: ChatPluginStatus
}

type OpenAiTool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

type McpTool = {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

/** First-class generation connectors (Adobe-style marketplace cards). */
export const GENERATION_MCP_PRESETS = [
  {
    id: 'higgsfield',
    name: 'Higgsfield',
    description:
      'Generate images, video, characters & audio via Higgsfield MCP (uses plan credits).',
    defaultUrl: 'https://mcp.higgsfield.ai/mcp',
    auth: 'oauth' as const,
    category: 'generation' as const,
  },
  {
    id: 'adobe',
    name: 'Adobe for creativity',
    description:
      'Firefly, Photoshop, Express & creative workflows via Adobe’s remote MCP.',
    defaultUrl: 'https://adobe-creativity.adobe.io/mcp',
    auth: 'oauth' as const,
    category: 'generation' as const,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description:
      'Cursor remote MCP for generation — set YUE_CHAT_MCP_CURSOR_URL (+ token) when Cursor publishes an endpoint.',
    defaultUrl: '',
    auth: 'oauth' as const,
    category: 'generation' as const,
  },
] as const

export type GenerationMcpPresetId = (typeof GENERATION_MCP_PRESETS)[number]['id']

function presetToken(id: GenerationMcpPresetId, creds?: ChatPluginCredentials): string {
  const user = creds?.[id]?.trim()
  if (user) return user
  if (id === 'higgsfield') return env.chatMcpHiggsfieldToken
  if (id === 'adobe') return env.chatMcpAdobeToken
  return env.chatMcpCursorToken
}

function presetUrl(id: GenerationMcpPresetId, fallback: string): string {
  if (id === 'higgsfield') return env.chatMcpHiggsfieldUrl || fallback
  if (id === 'adobe') return env.chatMcpAdobeUrl || fallback
  return env.chatMcpCursorUrl || fallback
}

function parseCustomMcpServers(): McpServerConfig[] {
  const raw = env.chatMcpServersJson
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: McpServerConfig[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const id = String((row as { id?: string }).id || '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 40)
      const name = String((row as { name?: string }).name || id).trim().slice(0, 80)
      const url = String((row as { url?: string }).url || '').trim()
      if (!id || !url || !/^https?:\/\//i.test(url)) continue
      const headers =
        (row as { headers?: Record<string, string> }).headers &&
        typeof (row as { headers?: unknown }).headers === 'object'
          ? (row as { headers: Record<string, string> }).headers
          : undefined
      out.push({
        id,
        name: name || id,
        url,
        headers,
        description: String((row as { description?: string }).description || '').slice(0, 240) || undefined,
        auth: headers?.Authorization ? 'bearer' : 'none',
        category: 'general',
        ready: true,
        status: 'ready',
      })
    }
    return out.slice(0, 8)
  } catch {
    return []
  }
}

function buildGenerationPresetServers(creds?: ChatPluginCredentials): McpServerConfig[] {
  return GENERATION_MCP_PRESETS.map((preset) => {
    const url = presetUrl(preset.id, preset.defaultUrl).trim()
    const token = presetToken(preset.id, creds).trim()
    const comingSoon = !url
    const ready = Boolean(url && token)
    const status: ChatPluginStatus = comingSoon
      ? 'coming_soon'
      : ready
        ? 'ready'
        : 'needs_token'
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined
    return {
      id: preset.id,
      name: preset.name,
      url: url || preset.defaultUrl || '',
      headers,
      description: preset.description,
      auth: preset.auth,
      category: preset.category,
      ready,
      status,
    }
  })
}

/**
 * All MCP server rows (presets + custom). Custom rows with the same id override presets.
 */
export function listConfiguredMcpServers(creds?: ChatPluginCredentials): McpServerConfig[] {
  const presets = buildGenerationPresetServers(creds)
  const custom = parseCustomMcpServers()
  const byId = new Map<string, McpServerConfig>()
  for (const p of presets) byId.set(p.id, p)
  for (const c of custom) {
    const prev = byId.get(c.id)
    byId.set(c.id, {
      ...c,
      category: prev?.category || c.category,
      // Custom with URL is ready even without token (headers may be embedded).
      ready: true,
      status: 'ready',
      auth: c.auth || prev?.auth || 'none',
    })
  }
  return [...byId.values()]
}

/** Marketplace catalog for GET /api/chat/plugins. */
export function listChatPlugins(creds?: ChatPluginCredentials): ChatPluginInfo[] {
  const imageOk = chatImageConfiguredWith(creds)
  const provider = chatImageProviderLabel(creds)
  const imageDesc =
    provider === 'gemini'
      ? 'Create images with Google Gemini (Nano Banana / Flash Image) via generate_image — shared server key or your Gemini key.'
      : provider === 'openai'
        ? 'Create images with OpenAI Images (DALL·E / gpt-image) via generate_image.'
        : 'Create images via generate_image. Set GEMINI_API_KEY on the API (preferred) or add Gemini/OpenAI in Plugins → API keys.'
  const videoOk = chatVideoConfigured()
  const builtins: ChatPluginInfo[] = [
    {
      id: 'image',
      name: provider === 'gemini' ? 'Image generation (Gemini)' : 'Image generation',
      description: imageDesc,
      kind: 'builtin',
      defaultEnabled: true,
      configured: imageOk,
      toolCount: 1,
      category: 'generation',
      auth: 'bearer',
      status: imageOk ? 'ready' : 'needs_token',
    },
    {
      id: 'video',
      name: 'Video generation (Seedance 2.5)',
      description: videoOk
        ? 'Create short videos with Higgsfield Seedance 2.5 via generate_video (server HF_CREDENTIALS).'
        : 'Create short videos via generate_video. Set HF_CREDENTIALS (KEY_ID:KEY_SECRET) on the API.',
      kind: 'builtin',
      defaultEnabled: true,
      configured: videoOk,
      toolCount: 1,
      category: 'generation',
      auth: 'bearer',
      status: videoOk ? 'ready' : 'needs_token',
    },
  ]

  const remote = listConfiguredMcpServers(creds).map((s) => ({
    id: `mcp:${s.id}`,
    name: s.name,
    description: s.description || `Remote MCP server at ${s.url}`,
    kind: 'mcp' as const,
    defaultEnabled: false,
    configured: s.ready,
    category: s.category || 'general',
    auth: s.auth || 'none',
    status: s.status,
    url: s.url || undefined,
  }))

  return [...builtins, ...remote]
}

function mcpToolName(serverId: string, toolName: string): string {
  const safeTool = toolName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)
  return `mcp__${serverId}__${safeTool}`
}

export function parseMcpToolName(name: string): { serverId: string; toolName: string } | null {
  const m = name.match(/^mcp__([a-zA-Z0-9_-]+)__(.+)$/)
  if (!m) return null
  return { serverId: m[1]!, toolName: m[2]! }
}

const sessionIds = new Map<string, string>()

async function mcpJsonRpc<T>(
  server: McpServerConfig,
  method: string,
  params?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  if (!server.url) throw new Error(`MCP ${server.id}: URL not configured`)
  if (!server.ready) {
    throw new Error(
      server.status === 'coming_soon'
        ? `MCP ${server.id}: coming soon — set the URL env when the endpoint ships.`
        : `MCP ${server.id}: needs a Bearer token (YUE_CHAT_MCP_${server.id.toUpperCase()}_TOKEN).`,
    )
  }

  const body = {
    jsonrpc: '2.0',
    id: Date.now() % 1_000_000,
    method,
    ...(params ? { params } : {}),
  }
  const session = sessionIds.get(server.id)
  const res = await fetch(server.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(session ? { 'mcp-session-id': session } : {}),
      ...(server.headers || {}),
    },
    body: JSON.stringify(body),
    signal,
  })
  const nextSession = res.headers.get('mcp-session-id')
  if (nextSession) sessionIds.set(server.id, nextSession)

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `MCP ${server.id}: auth failed (${res.status}). Refresh YUE_CHAT_MCP_${server.id.toUpperCase()}_TOKEN or reconnect OAuth.`,
      )
    }
    throw new Error(`MCP ${server.id} HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/event-stream')) {
    const text = await res.text()
    const dataLines = text
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
      .filter(Boolean)
    const last = dataLines.at(-1)
    if (!last) throw new Error(`MCP ${server.id}: empty SSE`)
    const parsed = JSON.parse(last) as { result?: T; error?: { message?: string } }
    if (parsed.error) throw new Error(parsed.error.message || 'MCP error')
    return parsed.result as T
  }
  const parsed = (await res.json()) as { result?: T; error?: { message?: string } }
  if (parsed.error) throw new Error(parsed.error.message || 'MCP error')
  return parsed.result as T
}

const toolCache = new Map<string, { at: number; tools: McpTool[] }>()
const TOOL_CACHE_MS = 60_000

export async function listMcpServerTools(
  serverId: string,
  signal?: AbortSignal,
  creds?: ChatPluginCredentials,
): Promise<McpTool[]> {
  const server = listConfiguredMcpServers(creds).find((s) => s.id === serverId)
  if (!server) throw new Error(`Unknown MCP server: ${serverId}`)
  if (!server.ready) {
    throw new Error(
      server.status === 'coming_soon'
        ? `MCP ${serverId} is coming soon`
        : `MCP ${serverId} needs a Bearer token — add it in Plugins → API keys.`,
    )
  }
  const cacheKey = `${serverId}:${server.headers?.Authorization ? 'auth' : 'anon'}`
  const cached = toolCache.get(cacheKey)
  if (cached && Date.now() - cached.at < TOOL_CACHE_MS) return cached.tools

  try {
    await mcpJsonRpc(
      server,
      'initialize',
      {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'jyuttranslate-chat', version: '0.2.0' },
      },
      signal,
    )
    await mcpJsonRpc(server, 'notifications/initialized', {}, signal).catch(() => null)
  } catch {
    /* continue — tools/list may still work */
  }

  const listed = await mcpJsonRpc<{ tools?: McpTool[] }>(server, 'tools/list', {}, signal)
  const tools = Array.isArray(listed?.tools) ? listed.tools.slice(0, 48) : []
  toolCache.set(cacheKey, { at: Date.now(), tools })
  return tools
}

export async function callMcpTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
  creds?: ChatPluginCredentials,
): Promise<string> {
  const server = listConfiguredMcpServers(creds).find((s) => s.id === serverId)
  if (!server) throw new Error(`Unknown MCP server: ${serverId}`)
  const result = await mcpJsonRpc<{
    content?: Array<{ type?: string; text?: string; data?: string; mimeType?: string }>
  }>(server, 'tools/call', { name: toolName, arguments: args }, signal)
  const texts = (result?.content || [])
    .filter((c) => c && (c.type === 'text' || typeof c.text === 'string'))
    .map((c) => String(c.text || ''))
    .filter(Boolean)
  if (texts.length) return texts.join('\n\n').slice(0, 24_000)
  return JSON.stringify(result ?? {}).slice(0, 24_000)
}

/** Pull http(s) image URLs from MCP tool text so the harness can emit SSE image events. */
export function extractImageUrlsFromMcpResult(text: string): string[] {
  const found = new Set<string>()
  const md = text.matchAll(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/gi)
  for (const m of md) {
    if (m[1]) found.add(m[1])
  }
  const bare = text.matchAll(/https?:\/\/[^\s"'<>)]+\.(?:png|jpe?g|gif|webp)(?:\?[^\s"'<>)]*)?/gi)
  for (const m of bare) {
    if (m[0]) found.add(m[0])
  }
  return [...found].slice(0, 4)
}

const IMAGE_TOOL: OpenAiTool = {
  type: 'function',
  function: {
    name: 'generate_image',
    description:
      'Generate an image from a text prompt (Google Gemini by default; OpenAI Images as fallback). Return the image to the user by including the provided markdown in your reply.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detailed image prompt' },
        size: {
          type: 'string',
          enum: ['1024x1024', '1024x1792', '1792x1024'],
          description: 'Optional size (DALL·E 3).',
        },
      },
      required: ['prompt'],
    },
  },
}

const VIDEO_TOOL: OpenAiTool = {
  type: 'function',
  function: {
    name: 'generate_video',
    description:
      'Generate a short video from a text prompt with Higgsfield Seedance 2.5 (billed). Return the video by including the provided markdown in your reply. Prefer for motion / cinematic clips; use generate_image for stills.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detailed video prompt' },
        duration: {
          type: 'integer',
          description: 'Seconds (4–15 in chat; default 5).',
        },
        resolution: {
          type: 'string',
          enum: ['480p', '720p', '1080p'],
          description: 'Default 720p.',
        },
        aspect_ratio: {
          type: 'string',
          enum: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
          description: 'Default 16:9.',
        },
        generate_audio: {
          type: 'boolean',
          description: 'Include generated audio (default true).',
        },
      },
      required: ['prompt'],
    },
  },
}

/**
 * Resolve enabled plugin ids → OpenAI function tools to merge into the harness.
 * `undefined` → default-enabled configured builtins; `[]` → explicitly none.
 */
export async function buildPluginTools(
  plugins: string[] | undefined,
  signal?: AbortSignal,
  creds?: ChatPluginCredentials,
): Promise<OpenAiTool[]> {
  const catalog = listChatPlugins(creds)
  const enabledIds =
    plugins === undefined
      ? catalog.filter((p) => p.defaultEnabled && p.configured).map((p) => p.id)
      : plugins
  const enabled = new Set(enabledIds.map(String))

  const tools: OpenAiTool[] = []

  if (enabled.has('image') && chatImageConfiguredWith(creds)) {
    tools.push(IMAGE_TOOL)
  }
  if (enabled.has('video') && chatVideoConfigured()) {
    tools.push(VIDEO_TOOL)
  }

  for (const plugin of catalog) {
    if (plugin.kind !== 'mcp' || !enabled.has(plugin.id) || !plugin.configured) continue
    const serverId = plugin.id.replace(/^mcp:/, '')
    try {
      const mcpTools = await listMcpServerTools(serverId, signal, creds)
      for (const t of mcpTools) {
        tools.push({
          type: 'function',
          function: {
            name: mcpToolName(serverId, t.name),
            description: (t.description || t.name).slice(0, 400),
            parameters: (t.inputSchema && typeof t.inputSchema === 'object'
              ? t.inputSchema
              : { type: 'object', properties: {} }) as Record<string, unknown>,
          },
        })
      }
    } catch (err) {
      console.warn('[deepseek-chat] MCP tools/list failed', serverId, err)
    }
  }

  return tools
}
