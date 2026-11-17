import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildDeepseekChatToolList,
  DEEPSEEK_CHAT_MAX_TOOL_ROUNDS,
  DEEPSEEK_CHAT_WEB_TOOLS,
  formatLatestReminder,
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

const routes = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), './deepseekChatRoutes.ts'),
  'utf8',
)
assert.match(routes, /streamDeepseekChatHarness/, 'Routes use unified harness')
assert.match(routes, /searchStep/, 'Routes forward search step cards')
assert.match(routes, /contentReplace/, 'Routes forward citation content_replace')
assert.match(routes, /primaryLang/, 'Routes accept primaryLang metadata')
assert.doesNotMatch(routes, /chat_refusal/, 'Routes must not surface content-safety refusals')
assert.match(routes, /harnessEmitted/, 'Partial harness streams do not concatenate fallbacks')

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
