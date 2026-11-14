/**
 * Light MCP bridge for DeepSeek Chat:
 * - Built-in plugins (image generation)
 * - Optional remote MCP servers via Streamable HTTP JSON-RPC (YUE_CHAT_MCP_SERVERS)
 *
 * Tools are exposed as OpenAI function tools with namespaced names:
 *   mcp__<serverId>__<toolName>
 */
import { env } from './env.js'
import { chatImageConfigured } from './deepseekChatImage.js'

export type ChatPluginKind = 'builtin' | 'mcp'

export type ChatPluginInfo = {
  id: string
  name: string
  description: string
  kind: ChatPluginKind
  /** Default-on for Family chat when listed. */
  defaultEnabled?: boolean
  configured: boolean
  toolCount?: number
}

type McpServerConfig = {
  id: string
  name: string
  url: string
  headers?: Record<string, string>
  description?: string
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

function parseMcpServers(): McpServerConfig[] {
  const raw = env.chatMcpServersJson
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: McpServerConfig[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const id = String((row as McpServerConfig).id || '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 40)
      const name = String((row as McpServerConfig).name || id).trim().slice(0, 80)
      const url = String((row as McpServerConfig).url || '').trim()
      if (!id || !url || !/^https?:\/\//i.test(url)) continue
      const headers =
        (row as McpServerConfig).headers && typeof (row as McpServerConfig).headers === 'object'
          ? (row as McpServerConfig).headers
          : undefined
      out.push({
        id,
        name: name || id,
        url,
        headers,
        description: String((row as McpServerConfig).description || '').slice(0, 240) || undefined,
      })
    }
    return out.slice(0, 8)
  } catch {
    return []
  }
}

export function listConfiguredMcpServers(): McpServerConfig[] {
  return parseMcpServers()
}

/** Marketplace catalog for GET /api/chat/plugins. */
export function listChatPlugins(): ChatPluginInfo[] {
  const builtins: ChatPluginInfo[] = [
    {
      id: 'image',
      name: 'Image generation',
      description: 'Create images with OpenAI Images (DALL·E / gpt-image) via the generate_image tool.',
      kind: 'builtin',
      defaultEnabled: true,
      configured: chatImageConfigured(),
      toolCount: 1,
    },
  ]
  const remote = listConfiguredMcpServers().map((s) => ({
    id: `mcp:${s.id}`,
    name: s.name,
    description: s.description || `Remote MCP server at ${s.url}`,
    kind: 'mcp' as const,
    defaultEnabled: false,
    configured: true,
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

async function mcpJsonRpc<T>(
  server: McpServerConfig,
  method: string,
  params?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const body = {
    jsonrpc: '2.0',
    id: Date.now() % 1_000_000,
    method,
    ...(params ? { params } : {}),
  }
  const res = await fetch(server.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(server.headers || {}),
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
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
): Promise<McpTool[]> {
  const server = listConfiguredMcpServers().find((s) => s.id === serverId)
  if (!server) throw new Error(`Unknown MCP server: ${serverId}`)
  const cached = toolCache.get(serverId)
  if (cached && Date.now() - cached.at < TOOL_CACHE_MS) return cached.tools

  // initialize (best-effort — some servers allow tools/list without it)
  try {
    await mcpJsonRpc(server, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'jyuttranslate-chat', version: '0.2.0' },
    }, signal)
    await mcpJsonRpc(server, 'notifications/initialized', {}, signal).catch(() => null)
  } catch {
    /* continue — tools/list may still work */
  }

  const listed = await mcpJsonRpc<{ tools?: McpTool[] }>(server, 'tools/list', {}, signal)
  const tools = Array.isArray(listed?.tools) ? listed.tools.slice(0, 32) : []
  toolCache.set(serverId, { at: Date.now(), tools })
  return tools
}

export async function callMcpTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<string> {
  const server = listConfiguredMcpServers().find((s) => s.id === serverId)
  if (!server) throw new Error(`Unknown MCP server: ${serverId}`)
  const result = await mcpJsonRpc<{ content?: Array<{ type?: string; text?: string }> }>(
    server,
    'tools/call',
    { name: toolName, arguments: args },
    signal,
  )
  const texts = (result?.content || [])
    .filter((c) => c && (c.type === 'text' || typeof c.text === 'string'))
    .map((c) => String(c.text || ''))
    .filter(Boolean)
  if (texts.length) return texts.join('\n\n').slice(0, 24_000)
  return JSON.stringify(result ?? {}).slice(0, 24_000)
}

const IMAGE_TOOL: OpenAiTool = {
  type: 'function',
  function: {
    name: 'generate_image',
    description:
      'Generate an image from a text prompt (OpenAI Images). Return the image to the user by including the provided markdown in your reply.',
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

/**
 * Resolve enabled plugin ids → OpenAI function tools to merge into the harness.
 * `undefined` → default-enabled configured builtins; `[]` → explicitly none.
 */
export async function buildPluginTools(
  plugins: string[] | undefined,
  signal?: AbortSignal,
): Promise<OpenAiTool[]> {
  const catalog = listChatPlugins()
  // undefined → default-enabled configured builtins; [] → explicitly none.
  const enabledIds =
    plugins === undefined
      ? catalog.filter((p) => p.defaultEnabled && p.configured).map((p) => p.id)
      : plugins
  const enabled = new Set(enabledIds.map(String))

  const tools: OpenAiTool[] = []

  if (enabled.has('image') && chatImageConfigured()) {
    tools.push(IMAGE_TOOL)
  }

  for (const plugin of catalog) {
    if (plugin.kind !== 'mcp' || !enabled.has(plugin.id)) continue
    const serverId = plugin.id.replace(/^mcp:/, '')
    try {
      const mcpTools = await listMcpServerTools(serverId, signal)
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
