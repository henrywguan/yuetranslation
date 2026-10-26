import assert from 'node:assert/strict'
import {
  canUseDeepseekChat,
  DEEPSEEK_CHAT_SYSTEM,
  deepseekChatTurnLimit,
  DeepseekChatBodySchema,
  recentDeepseekChatMessages,
  type DeepseekChatMessage,
} from './deepseekChat.js'

assert.match(DEEPSEEK_CHAT_SYSTEM, /helpful AI assistant/i, 'System prompt is general assistant')
assert.doesNotMatch(DEEPSEEK_CHAT_SYSTEM, /JyutTranslate|Cantonese|粵語/i, 'No product/Cantonese framing')

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
})
assert.equal(ok.success, true)

const bad = DeepseekChatBodySchema.safeParse({ messages: [] })
assert.equal(bad.success, false)

console.log('deepseekChat.smoke: ok')
