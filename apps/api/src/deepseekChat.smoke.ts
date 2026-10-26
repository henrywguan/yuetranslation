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

assert.match(DEEPSEEK_CHAT_SYSTEM, /helpful AI assistant/i, 'System prompt is general assistant')
assert.doesNotMatch(DEEPSEEK_CHAT_SYSTEM, /JyutTranslate|Cantonese|粵語/i, 'No product/Cantonese framing')
assert.doesNotMatch(DEEPSEEK_CHAT_SYSTEM, /concise/i, 'Do not bias chat toward shallow brevity')
assert.match(DEEPSEEK_CHAT_SYSTEM, /thorough/i, 'Encourage thorough answers when useful')
assert.ok(DEEPSEEK_CHAT_MAX_TOKENS >= 4096, 'Chat needs room for thinking + answer')

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
})
assert.equal(ok.success, true)
assert.equal(ok.data?.search, true)

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

console.log('deepseekChat.smoke: ok')
