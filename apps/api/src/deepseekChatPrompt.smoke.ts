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
  mode: 'tools',
})
assert.match(system, /Current datetime/)
assert.match(system, /get_date/)
assert.match(system, /jyut_plan_limits/)
assert.match(system, /Freshness/)
assert.match(system, /family/)

const searchSystem = buildDeepseekChatSystem({ mode: 'search', now: fixed })
assert.match(searchSystem, /Plan snapshot/, 'Legacy search-only mode still embeds plan snapshot')
assert.match(searchSystem, /get_date/, 'Unified prompt keeps client tools catalog')

const webOn = buildDeepseekChatSystem({ searchEnabled: true, now: fixed, mode: 'tools' })
assert.match(webOn, /deepseek_web_search/)
assert.match(webOn, /jyut_plan_limits/)
assert.match(webOn, /Never end the turn with only/, 'Web skills forbid I\'ll-search stopovers')

const harnessOn = buildDeepseekChatSystem({ harnessEnabled: true, now: fixed, mode: 'tools' })
assert.match(harnessOn, /workspace_write/)
assert.match(harnessOn, /Harness mode is ON/)
assert.doesNotMatch(
  buildDeepseekChatSystem({ now: fixed, mode: 'tools' }),
  /Harness mode is ON/,
  'Harness nudge only when enabled',
)

const overseer = buildDeepseekChatSystem({
  inboxRole: 'overseer',
  projectMemory: 'Ship Inbox Phase B',
  now: fixed,
  mode: 'tools',
})
assert.match(overseer, /Project Overseer/)
assert.match(overseer, /Ship Inbox Phase B/)
assert.match(overseer, /project_create_agent/)
assert.match(overseer, /Never ask the user to click Spawn/)
assert.match(
  buildDeepseekChatSystem({ inboxRole: 'worker', now: fixed, mode: 'tools' }),
  /worker agent/i,
)
assert.match(
  buildDeepseekChatSystem({ sandboxSessionId: 'sbx_abc', now: fixed, mode: 'tools' }),
  /coding sandbox/i,
)

assert.equal(shouldAutoEnableSearch('what day is today?'), false, 'clock questions use temporal inject')
assert.equal(shouldAutoEnableSearch("what's the latest news on AI?"), true)
assert.equal(shouldAutoEnableSearch('who is the current president of France?'), true)
assert.equal(shouldAutoEnableSearch('Explain quantum computing'), false)
assert.equal(shouldAutoEnableSearch('Explain how the stock market works'), false, 'no bare stock keyword')
assert.equal(shouldAutoEnableSearch('What does a test score mean?'), false)
assert.equal(shouldAutoEnableSearch('stock price of AAPL'), true)

console.log('deepseekChatPrompt.smoke: ok')
