import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildDeepseekChatToolList,
  DEEPSEEK_CHAT_MAX_TOOL_ROUNDS,
  DEEPSEEK_CHAT_WEB_TOOLS,
  formatLatestReminder,
  looksLikeDeferredOrchestration,
  looksLikeDeferredSearch,
  looksLikeDeferredSearchTurn,
  looksLikeDeferredToolUse,
} from './deepseekChatHarness.js'
import { deepseekChatModel, deepseekChatSupportsNativeWebTools } from './deepseekChat.js'

assert.ok(DEEPSEEK_CHAT_MAX_TOOL_ROUNDS >= 8, 'Harness needs room for multi-step tool use')
assert.equal(DEEPSEEK_CHAT_WEB_TOOLS.length, 2)
assert.ok(DEEPSEEK_CHAT_WEB_TOOLS.some((t) => t.type === 'deepseek_web_search'))
assert.ok(DEEPSEEK_CHAT_WEB_TOOLS.some((t) => t.type === 'deepseek_read_url'))

const noSearch = buildDeepseekChatToolList(false)
assert.ok(noSearch.length >= 5, 'Client function tools always present')
assert.ok(
  !noSearch.some((t) => (t as { type?: string }).type === 'deepseek_web_search'),
  'Search off must not declare web tools',
)
assert.ok(
  !noSearch.some(
    (t) => (t as { function?: { name?: string } }).function?.name === 'workspace_list',
  ),
  'Workspace tools only when Harness mode is on',
)
const withHarness = buildDeepseekChatToolList(false, [], true)
assert.ok(
  withHarness.some(
    (t) => (t as { function?: { name?: string } }).function?.name === 'workspace_write',
  ),
  'Harness mode declares workspace_write',
)
const askHarness = buildDeepseekChatToolList(false, [], true, true, true, 'ask')
assert.ok(
  askHarness.some(
    (t) => (t as { function?: { name?: string } }).function?.name === 'workspace_list',
  ),
  'Ask keeps workspace_list',
)
assert.ok(
  !askHarness.some(
    (t) => (t as { function?: { name?: string } }).function?.name === 'workspace_write',
  ),
  'Ask strips workspace_write',
)
assert.ok(
  !askHarness.some(
    (t) => (t as { function?: { name?: string } }).function?.name === 'sandbox_write',
  ),
  'Ask strips sandbox_write',
)
assert.ok(
  !askHarness.some(
    (t) => (t as { function?: { name?: string } }).function?.name === 'project_create_agent',
  ),
  'Ask strips project_create_agent',
)
const planTools = buildDeepseekChatToolList(false, [], true, false, true, 'plan')
assert.ok(
  !planTools.some(
    (t) => (t as { function?: { name?: string } }).function?.name === 'project_message_agent',
  ),
  'Plan strips project_message_agent',
)
assert.match(
  readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChat.ts'),
    'utf8',
  ),
  /chatMode:\s*z\.enum\(\['agent',\s*'ask',\s*'plan'\]\)/,
  'Body schema accepts chatMode',
)

const withSearch = buildDeepseekChatToolList(true)
if (deepseekChatSupportsNativeWebTools()) {
  assert.ok(
    withSearch.some((t) => (t as { type?: string }).type === 'deepseek_web_search'),
    'Search on + DeepSeek host declares deepseek_web_search',
  )
  assert.ok(
    withSearch.some((t) => (t as { type?: string }).type === 'deepseek_read_url'),
    'Search on + DeepSeek host declares deepseek_read_url',
  )
  assert.ok(
    withSearch.some((t) => (t as { type?: string }).type === 'function'),
    'Client tools remain alongside web tools',
  )
}

const reminder = formatLatestReminder({
  timeZone: 'America/Los_Angeles',
  locale: 'en-US',
  now: new Date('2026-11-14T18:00:00Z'),
})
assert.equal(reminder.role, 'latest_reminder')
assert.match(reminder.content, /^2026-11-14,Saturday,Los Angeles,Web,English$/)

const yueReminder = formatLatestReminder({
  timeZone: 'America/Los_Angeles',
  locale: 'en-US',
  primaryLang: 'yue',
  now: new Date('2026-11-14T18:00:00Z'),
})
assert.match(yueReminder.content, /,Web,Cantonese$/)

assert.equal(typeof deepseekChatModel(), 'string')
assert.ok(deepseekChatModel().length > 0)

const harnessSrc = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatHarness.ts'),
  'utf8',
)
assert.match(harnessSrc, /content_replace/, 'Harness rewrites answer with citation chips')
assert.match(harnessSrc, /image_url/, 'Harness extracts image_search cards')
assert.match(harnessSrc, /orderedSources/, 'Cited sources emit in chip order')
assert.match(harnessSrc, /content_replace.*reply = ev\.text|ev\.kind === 'content_replace'/, 'Non-stream reply applies content_replace')
assert.doesNotMatch(
  harnessSrc,
  /safety_check\s*[:=]/,
  'Harness must not enable DeepSeek safety_check (uncensored chat)',
)
assert.match(harnessSrc, /uncensored|abliterated|Do not set safety_check/, 'Harness documents uncensored policy')
assert.match(harnessSrc, /enabled:\s*true/, 'Harness requests conversation titles')
assert.match(harnessSrc, /body\.title/, 'Harness sets title on Completions body')
assert.match(harnessSrc, /latest_reminder/, 'Harness injects user metadata marker')
assert.match(harnessSrc, /deepseek_web_search/, 'Harness declares native web search')
assert.match(
  harnessSrc,
  /deferredSearchRecoveries|deferred-search recovery/,
  'Harness recovers empty search promises',
)
assert.match(harnessSrc, /MAX_DEFERRED_SEARCH_RECOVERIES/, 'Harness allows a second search nudge')
assert.match(harnessSrc, /looksLikeDeferredSearch/, 'Harness detects I\'ll-search stopovers')
assert.match(
  harnessSrc,
  /didServerSearch = allSources\.size > 0/,
  'Bare call_started does not block deferred-search recovery',
)
assert.match(
  harnessSrc,
  /deferredOrchestrationRecovered|deferred-orchestration recovery/,
  'Harness recovers empty Overseer worker promises',
)
assert.match(harnessSrc, /looksLikeDeferredOrchestration/, 'Harness detects I\'ll-set-up-workers stopovers')
assert.match(harnessSrc, /DEEPSEEK_CHAT_WORKSPACE_TOOLS/, 'Harness can attach workspace tools')
assert.match(harnessSrc, /harnessEnabled/, 'Harness mode flag wired')
assert.match(harnessSrc, /kind: 'workspace'/, 'Harness yields workspace SSE events')

assert.equal(
  looksLikeDeferredSearch("I'll search for the latest Warframe news and updates from the past week."),
  true,
)
assert.equal(looksLikeDeferredSearch('Let me search the web for that.'), true)
assert.equal(
  looksLikeDeferredSearch("I'll look into what 'GrokBot' refers to…"),
  true,
  'Henry GrokBot stall phrase is deferred-search',
)
assert.equal(
  looksLikeDeferredSearch("I'll check…"),
  true,
  'Henry I\'ll-check ellipsis is deferred-search',
)
assert.equal(
  looksLikeDeferredSearch('Running the searches now'),
  true,
  'Henry running-the-searches status line is deferred-search',
)
assert.equal(
  looksLikeDeferredSearch("I'll check what's new this week."),
  true,
  'Warframe-style what\'s-new check is deferred-search',
)
assert.equal(
  looksLikeDeferredSearchTurn(
    "I'll check…",
    'Let me search the web for Warframe updates this week.',
  ),
  true,
  'DeepThink plan + I\'ll-check… filler is deferred',
)
assert.equal(
  looksLikeDeferredSearchTurn(
    "I'll look into what 'GrokBot' refers to…",
    'Let me search the web for information about GrokBot. Let me search the web…',
  ),
  true,
  'DeepThink search plan + soft look-into reply is deferred',
)
assert.equal(
  looksLikeDeferredSearchTurn(
    'GrokBot is xAI’s agent product that…',
    'Let me search the web for confirmation.',
  ),
  false,
  'substantive answers are not deferred even if reasoning mentioned search',
)
assert.equal(
  looksLikeDeferredSearch(
    'Warframe got a major update this week with new quests, balance changes, and a weekend platinum sale. Here are the highlights…',
  ),
  false,
  'real answers are not deferred-search',
)
assert.equal(
  looksLikeDeferredSearch("I'll check the weather in Hong Kong for you."),
  false,
  'weather check stays out of deferred-search (tool path)',
)
assert.equal(
  looksLikeDeferredToolUse("I'll check the weather in Hong Kong for you."),
  true,
  'weather announce without tool_calls is deferred-tool',
)
assert.equal(looksLikeDeferredToolUse('Calling get_weather next.'), true)
assert.equal(
  looksLikeDeferredToolUse(
    "Let me pull up those exact widgets and the guide so the mockup and the build steps actually match what you'll install.",
  ),
  true,
  'Henry ricing widgets/guide announce is deferred-tool',
)
assert.equal(
  looksLikeDeferredToolUse('It is 28°C and humid in Hong Kong this afternoon.'),
  false,
  'real weather answers are not deferred-tool',
)
assert.match(harnessSrc, /looksLikeDeferredSearchTurn/, 'Harness uses reply+reasoning deferred search')
assert.match(harnessSrc, /deferredToolRecovered|deferred-tool recovery/, 'Harness recovers empty tool promises')
assert.match(harnessSrc, /looksLikeDeferredToolUse/, 'Harness detects I\'ll-check-weather stopovers')
assert.match(harnessSrc, /executeDeepseekChatToolWithTimeout/, 'Harness wraps tools with timeout')
assert.match(harnessSrc, /sanitizeDeepseekChatVisibleText/, 'Harness strips leaked system tags')

assert.equal(
  looksLikeDeferredOrchestration(
    "I'll get grounded in the RuneScape Dragonwilds docs and mechanics, then set up the knowledge-base project with workers.",
  ),
  true,
  'Henry stall phrase is deferred orchestration',
)
assert.equal(
  looksLikeDeferredOrchestration('Let me create a worker for the knowledge base.'),
  true,
)
assert.equal(
  looksLikeDeferredOrchestration(
    'Created worker · Dragonwilds KB and queued the first research pass. Watch Needs Attention when it reports back.',
  ),
  false,
  'real orchestration status is not deferred',
)

const routes = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatRoutes.ts'),
  'utf8',
)
assert.match(routes, /streamDeepseekChatHarness/, 'Routes use unified harness')
assert.match(routes, /searchStep/, 'Routes forward search step cards')
assert.match(routes, /contentReplace/, 'Routes forward citation content_replace')
assert.match(routes, /primaryLang/, 'Routes accept primaryLang metadata')
assert.match(routes, /chatMode/, 'Routes forward chatMode')
assert.doesNotMatch(routes, /chat_refusal/, 'Routes must not surface content-safety refusals')
assert.match(routes, /harnessEmitted/, 'Partial harness streams do not concatenate fallbacks')
assert.match(routes, /workspace:\s*\{\s*files/, 'Routes forward workspace SSE')

const agentSrc = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatAgent.ts'),
  'utf8',
)
assert.doesNotMatch(agentSrc, /safety_check/, 'Agent fallback must not enable safety_check')

const searchSrc = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatSearch.ts'),
  'utf8',
)
assert.doesNotMatch(searchSrc, /safety_check\s*:/, 'Anthropic search fallback must not enable safety_check')

const filesSrc = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatFiles.ts'),
  'utf8',
)
assert.match(filesSrc, /\/files/, 'Chat file proxy hits DeepSeek Files API')
assert.match(filesSrc, /file-api-/, 'Chat file ids are DeepSeek file-api-*')

console.log('deepseekChatHarness.smoke: ok')
