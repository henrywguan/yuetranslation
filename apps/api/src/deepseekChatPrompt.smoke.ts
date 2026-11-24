import assert from 'node:assert/strict'
import {
  buildDeepseekChatSystem,
  formatTemporalBlock,
  resolveChatCapabilities,
  shouldAutoEnableSearch,
  shouldAutoEnableThinking,
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
assert.match(webOn, /look into/, 'Web skills forbid I\'ll-look-into stopovers')
assert.match(webOn, /Running the searches now|I\\'ll check/, 'Web skills forbid check/running-searches stopovers')

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

const askMode = buildDeepseekChatSystem({
  chatMode: 'ask',
  harnessEnabled: true,
  sandboxSessionId: 'sbx_abc',
  inboxRole: 'overseer',
  now: fixed,
  mode: 'tools',
})
assert.match(askMode, /Ask mode is ON/)
assert.match(askMode, /read-only/)
assert.doesNotMatch(askMode, /Project Overseer for JyutTranslate/, 'Ask skips Overseer spawn skills')
assert.match(askMode, /workspace_list, workspace_read only/)
assert.doesNotMatch(askMode, /generate_image/, 'Ask must not advertise image tools')
assert.doesNotMatch(askMode, /mcp__/, 'Ask must not advertise MCP generation tools')
assert.match(askMode, /do not stall/i, 'Ask prompt warns against empty look-up promises')

const planMode = buildDeepseekChatSystem({
  chatMode: 'plan',
  inboxRole: 'overseer',
  now: fixed,
  mode: 'tools',
})
assert.match(planMode, /Plan mode is ON/)
assert.match(planMode, /Ready to Build/)
assert.match(planMode, /do not create or message workers until the user clicks Build/i)

assert.equal(shouldAutoEnableSearch('what day is today?'), false, 'clock questions use temporal inject')
assert.equal(shouldAutoEnableSearch("what's the latest news on AI?"), true)
assert.equal(shouldAutoEnableSearch('who is the current president of France?'), true)
assert.equal(shouldAutoEnableSearch('Explain quantum computing'), false)
assert.equal(shouldAutoEnableSearch('Explain how the stock market works'), false, 'no bare stock keyword')
assert.equal(shouldAutoEnableSearch('What does a test score mean?'), false)
assert.equal(shouldAutoEnableSearch('stock price of AAPL'), true)

assert.equal(shouldAutoEnableThinking('hi'), false, 'greetings stay fast')
assert.equal(shouldAutoEnableThinking('Draft a polite follow-up email'), false, 'short drafts stay fast')
assert.equal(shouldAutoEnableThinking('Explain quantum computing simply'), false, 'simple explain stays fast')
assert.equal(shouldAutoEnableThinking('Prove that √2 is irrational'), true, 'proofs need DeepThink')
assert.equal(
  shouldAutoEnableThinking('Debug why this race condition hangs'),
  true,
  'debug needs DeepThink',
)
assert.equal(
  shouldAutoEnableThinking('Please reason step by step about this puzzle'),
  true,
  'explicit step-by-step',
)
assert.equal(
  shouldAutoEnableThinking('Compare Postgres vs MySQL trade-offs for multi-tenant SaaS'),
  true,
  'tradeoff compare',
)
assert.equal(
  shouldAutoEnableThinking(
    'If nvidia fell through as a company, how would that have affected the us economy',
  ),
  true,
  'macro counterfactual needs DeepThink (Auto blank-page freeze case)',
)
assert.equal(
  shouldAutoEnableThinking('how would higher interest rates affect housing demand'),
  true,
  'how-would-affect analysis',
)

const autoEasy = resolveChatCapabilities({
  thinking: 'auto',
  search: 'auto',
  userText: 'Draft a polite follow-up email',
  supportsSearch: true,
})
assert.equal(autoEasy.thinkingEnabled, false, 'Auto disables DeepThink on drafts')
assert.equal(autoEasy.searchEnabled, false, 'Auto disables Search on drafts')
assert.equal(autoEasy.thinkingAuto, false)
assert.equal(autoEasy.searchAuto, false)

const autoHard = resolveChatCapabilities({
  thinking: 'auto',
  search: 'auto',
  userText: 'Prove the quadratic formula step by step',
  supportsSearch: true,
})
assert.equal(autoHard.thinkingEnabled, true, 'Auto enables DeepThink on hard asks')
assert.equal(autoHard.thinkingAuto, true)
assert.equal(autoHard.searchEnabled, false)

const autoNews = resolveChatCapabilities({
  thinking: 'auto',
  search: 'auto',
  userText: "what's the latest news on AI?",
  supportsSearch: true,
})
assert.equal(autoNews.searchEnabled, true)
assert.equal(autoNews.searchAuto, true)
assert.equal(autoNews.thinkingEnabled, false, 'news alone does not force DeepThink')

const forceThink = resolveChatCapabilities({
  thinking: true,
  search: false,
  userText: 'hi',
  supportsSearch: true,
})
assert.equal(forceThink.thinkingEnabled, true, 'manual DeepThink on')
assert.equal(forceThink.searchEnabled, false, 'no freshness → search stays off')

const omitDefaults = resolveChatCapabilities({
  userText: 'hi',
  supportsSearch: true,
})
assert.equal(omitDefaults.thinkingEnabled, true, 'omit thinking defaults on (legacy)')

const continueOff = resolveChatCapabilities({
  thinking: 'auto',
  search: 'auto',
  userText: "what's the latest news on AI?",
  continueReply: true,
  supportsSearch: true,
})
assert.equal(continueOff.searchEnabled, false, 'continue forces search off')
assert.equal(continueOff.searchAuto, false)

const forceSearch = resolveChatCapabilities({
  thinking: false,
  search: true,
  userText: 'hi',
  supportsSearch: true,
})
assert.equal(forceSearch.thinkingEnabled, false)
assert.equal(forceSearch.searchEnabled, true)
assert.equal(forceSearch.searchAuto, false)

console.log('deepseekChatPrompt.smoke: ok')
