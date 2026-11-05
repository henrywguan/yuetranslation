import assert from 'node:assert/strict'
import {
  buildDeepseekChatSystem,
  formatTemporalBlock,
  shouldAutoEnableSearch,
  DEEPSEEK_CHAT_SYSTEM_BASE,
} from './deepseekChatPrompt.js'

assert.match(DEEPSEEK_CHAT_SYSTEM_BASE, /helpful AI assistant/i)
assert.doesNotMatch(DEEPSEEK_CHAT_SYSTEM_BASE, /Current datetime/i)

const fixed = new Date('2026-11-05T03:00:00.000Z')
const block = formatTemporalBlock({ timeZone: 'America/Los_Angeles', now: fixed, locale: 'en-US' })
assert.match(block, /2026-11-05T03:00:00.000Z/)
assert.match(block, /America\/Los_Angeles/)
assert.match(block, /Wednesday|Tuesday/i) // LA evening Tue → Wed UTC-depending; just ensure weekday present

const badLocale = formatTemporalBlock({ timeZone: 'UTC', now: fixed, locale: '!!!not-a-locale!!!' })
assert.match(badLocale, /2026-11-05T03:00:00.000Z/, 'invalid locale falls back without throwing')

const system = buildDeepseekChatSystem({
  timeZone: 'America/Los_Angeles',
  now: fixed,
  plan: 'family',
})
assert.match(system, /Current datetime/)
assert.match(system, /get_date/)
assert.match(system, /jyut_plan_limits/)
assert.match(system, /Freshness/)
assert.match(system, /family/)

assert.equal(shouldAutoEnableSearch('what day is today?'), false, 'clock questions use temporal inject')
assert.equal(shouldAutoEnableSearch("what's the latest news on AI?"), true)
assert.equal(shouldAutoEnableSearch('who is the current president of France?'), true)
assert.equal(shouldAutoEnableSearch('Explain quantum computing'), false)

console.log('deepseekChatPrompt.smoke: ok')
