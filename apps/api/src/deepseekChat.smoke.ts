import assert from 'node:assert/strict'
import {
  canUseDeepseekChat,
  DEEPSEEK_CHAT_MAX_TOKENS,
  DEEPSEEK_CHAT_SYSTEM,
  deepseekChatLlmExtras,
  deepseekChatTurnLimit,
  DeepseekChatBodySchema,
  recentDeepseekChatMessages,
  type DeepseekChatMessage,
} from './deepseekChat.js'
import {
  deepseekAnthropicBaseUrl,
  deepseekAnthropicMessagesUrl,
  deepseekChatSupportsSearch,
} from './deepseekChatSearch.js'
import { DEEPSEEK_CHAT_SSE_HEARTBEAT_MS } from './deepseekChatRoutes.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

assert.match(DEEPSEEK_CHAT_SYSTEM, /helpful AI assistant/i, 'System prompt is general assistant')
assert.doesNotMatch(DEEPSEEK_CHAT_SYSTEM, /concise/i, 'Do not bias chat toward shallow brevity')
assert.match(DEEPSEEK_CHAT_SYSTEM, /thorough/i, 'Encourage thorough answers when useful')
assert.ok(DEEPSEEK_CHAT_MAX_TOKENS >= 4096, 'Chat needs room for thinking + answer')

// Dynamic system (temporal + skills) is built per request — base stays timeless.
const { buildDeepseekChatSystem } = await import('./deepseekChatPrompt.js')
const liveSystem = buildDeepseekChatSystem({ timeZone: 'UTC', plan: 'family' })
assert.match(liveSystem, /Current datetime/)
assert.match(liveSystem, /jyut_plan_limits/)
assert.match(liveSystem, /get_date/)

const extras = deepseekChatLlmExtras()
// When OPENAI_MODEL / base URL is not DeepSeek in this smoke env, extras may be {}.
// The helper must never force thinking:disabled (that was the quality bug).
assert.notEqual(
  (extras.thinking as { type?: string } | undefined)?.type,
  'disabled',
  'Chat must not disable DeepSeek thinking',
)

assert.equal(canUseDeepseekChat('guest', false), false)
assert.equal(canUseDeepseekChat('free', false), false)
assert.equal(canUseDeepseekChat('family', false), true)
assert.equal(canUseDeepseekChat('business', false), true)
assert.equal(canUseDeepseekChat('free', true), true, 'Admins can chat on Free')

assert.equal(deepseekChatTurnLimit('free', false), 0)
assert.ok(deepseekChatTurnLimit('family', false) >= 0)
assert.equal(deepseekChatTurnLimit('business', true), 0, 'Admin unlimited')

const many: DeepseekChatMessage[] = Array.from({ length: 40 }, (_, i) => ({
  role: i % 2 === 0 ? 'user' : 'assistant',
  content: `m${i}`,
}))
const recent = recentDeepseekChatMessages(many)
assert.equal(recent.length, 24)
assert.equal(recent[0]?.content, 'm16')
assert.equal(recent.at(-1)?.content, 'm39')

const ok = DeepseekChatBodySchema.safeParse({
  messages: [{ role: 'user', content: 'Hello' }],
  thinking: true,
  search: true,
  timeZone: 'America/Los_Angeles',
  locale: 'en-US',
})
assert.equal(ok.success, true)
assert.equal(ok.data?.search, true)
assert.equal(ok.data?.timeZone, 'America/Los_Angeles')

const routes = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatRoutes.ts'),
  'utf8',
)
assert.match(routes, /shouldAutoEnableSearch/, 'Routes auto-enable search for freshness intents')
assert.match(routes, /streamDeepseekChatAgent/, 'Routes use tool agent when search is off')

const agent = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatAgent.ts'),
  'utf8',
)
assert.match(agent, /DEEPSEEK_CHAT_TOOLS/, 'Agent registers chat tools')
assert.match(agent, /reasoning_content/, 'Tool rounds echo reasoning_content')

const bad = DeepseekChatBodySchema.safeParse({ messages: [] })
assert.equal(bad.success, false)

assert.equal(
  deepseekAnthropicBaseUrl('https://api.deepseek.com/v1'),
  'https://api.deepseek.com/anthropic',
)
assert.equal(
  deepseekAnthropicMessagesUrl('https://api.deepseek.com/v1'),
  'https://api.deepseek.com/anthropic/v1/messages',
)
assert.equal(
  deepseekAnthropicBaseUrl('https://api.deepseek.com/v1/'),
  'https://api.deepseek.com/anthropic',
)
assert.equal(typeof deepseekChatSupportsSearch(), 'boolean')

assert.ok(
  DEEPSEEK_CHAT_SSE_HEARTBEAT_MS >= 5_000 && DEEPSEEK_CHAT_SSE_HEARTBEAT_MS <= 30_000,
  'SSE heartbeats should be frequent enough for Vercel HTTP/1.1 idle proxies',
)

const vercelJsonPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../vercel.json')
const vercel = JSON.parse(readFileSync(vercelJsonPath, 'utf8')) as {
  functions?: { 'api/index.ts'?: { maxDuration?: number } }
}
const maxDuration = vercel.functions?.['api/index.ts']?.maxDuration
assert.ok(
  typeof maxDuration === 'number' && maxDuration >= 300,
  'DeepThink chat needs api maxDuration ≥ 300s (was timing out at 60s)',
)

console.log('deepseekChat.smoke: ok')
