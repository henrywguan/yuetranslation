import assert from 'node:assert/strict'
import {
  convertUnits,
  DEEPSEEK_CHAT_TOOLS,
  DEEPSEEK_CHAT_WORKSPACE_TOOLS,
  deepseekChatToolTimeoutMs,
  executeDeepseekChatTool,
  executeDeepseekChatToolWithTimeout,
  safeCalc,
} from './deepseekChatTools.js'
import { CHAT_IMAGE_TIMEOUT_MS } from './deepseekChatImage.js'
import { createWorkspaceStore } from './deepseekChatWorkspace.js'

assert.ok(DEEPSEEK_CHAT_TOOLS.some((t) => t.function.name === 'get_date'))
assert.ok(DEEPSEEK_CHAT_TOOLS.some((t) => t.function.name === 'jyut_plan_limits'))
assert.ok(DEEPSEEK_CHAT_TOOLS.some((t) => t.function.name === 'fetch_url'))
assert.ok(DEEPSEEK_CHAT_WORKSPACE_TOOLS.some((t) => t.function.name === 'workspace_list'))
assert.ok(DEEPSEEK_CHAT_WORKSPACE_TOOLS.some((t) => t.function.name === 'workspace_read'))
assert.ok(DEEPSEEK_CHAT_WORKSPACE_TOOLS.some((t) => t.function.name === 'workspace_write'))

assert.equal(safeCalc('2+3*4'), 14)
assert.equal(safeCalc('(10-4)/2'), 3)
assert.throws(() => safeCalc('process.exit(1)'))
assert.throws(() => safeCalc('2+'))

assert.ok(Math.abs(convertUnits(32, 'f', 'c')) < 1e-9)
assert.ok(Math.abs(convertUnits(1, 'km', 'm') - 1000) < 1e-9)
assert.throws(() => convertUnits(1, 'km', 'kg'))

const fixed = new Date('2026-11-05T20:00:00.000Z')
const dateJson = await executeDeepseekChatTool('get_date', '{}', {
  timeZone: 'America/Los_Angeles',
  now: fixed,
})
const date = JSON.parse(dateJson) as { date: string; weekday: string; timeZone: string }
assert.equal(date.timeZone, 'America/Los_Angeles')
assert.match(date.date, /^\d{4}-\d{2}-\d{2}$/)

const limits = JSON.parse(await executeDeepseekChatTool('jyut_plan_limits', '{}', {})) as {
  family: { seats: number }
  guest: { liveMinutes: number }
}
assert.equal(limits.family.seats, 4)
assert.ok(limits.guest.liveMinutes > 0)

const badPair = JSON.parse(
  await executeDeepseekChatTool(
    'jyut_phrase_lookup',
    JSON.stringify({ text: 'hello', sourceLang: 'cmn', targetLang: 'yue' }),
    {},
  ),
) as { error?: string; found?: boolean }
assert.equal(badPair.found, false)
assert.match(String(badPair.error || ''), /en↔yue only/)

const learn = JSON.parse(await executeDeepseekChatTool('jyut_learn_hint', '{}', {})) as {
  route: string
}
assert.equal(learn.route, '#/learn')

const blocked = JSON.parse(
  await executeDeepseekChatTool('fetch_url', JSON.stringify({ url: 'https://localhost/x' }), {}),
) as { error?: string }
assert.match(String(blocked.error || ''), /Private|blocked|local/i)

const badProto = JSON.parse(
  await executeDeepseekChatTool('fetch_url', JSON.stringify({ url: 'http://example.com' }), {}),
) as { error?: string }
assert.match(String(badProto.error || ''), /https/i)

const { fetchPublicHttpsText } = await import('./deepseekChatTools.js')
// Ensure redirect: 'manual' path is present (SSRF hardening).
const toolsSrc = await import('node:fs').then((fs) =>
  fs.readFileSync(new URL('./deepseekChatTools.ts', import.meta.url), 'utf8'),
)
assert.match(toolsSrc, /redirect: 'manual'/)
assert.match(toolsSrc, /FETCH_MAX_BYTES/)
void fetchPublicHttpsText

const store = createWorkspaceStore([])
const noWs = JSON.parse(await executeDeepseekChatTool('workspace_list', '{}', {})) as {
  error?: string
}
assert.match(String(noWs.error || ''), /Harness|unavailable/i)

const listed = JSON.parse(
  await executeDeepseekChatTool('workspace_list', '{}', { workspace: store }),
) as { count: number }
assert.equal(listed.count, 0)

const wrote = JSON.parse(
  await executeDeepseekChatTool(
    'workspace_write',
    JSON.stringify({ path: 'notes/a.md', text: 'hello harness' }),
    { workspace: store },
  ),
) as { ok?: boolean; path?: string }
assert.equal(wrote.ok, true)
assert.equal(wrote.path, 'notes/a.md')

const read = JSON.parse(
  await executeDeepseekChatTool(
    'workspace_read',
    JSON.stringify({ path: 'notes/a.md' }),
    { workspace: store },
  ),
) as { text?: string }
assert.equal(read.text, 'hello harness')

assert.ok(deepseekChatToolTimeoutMs('generate_image') >= CHAT_IMAGE_TIMEOUT_MS)
assert.ok(deepseekChatToolTimeoutMs('fetch_url') <= 30_000)
assert.ok(typeof executeDeepseekChatToolWithTimeout === 'function')

const timed = JSON.parse(
  await executeDeepseekChatToolWithTimeout(
    'get_date',
    '{}',
    { timeZone: 'UTC', now: fixed },
    5_000,
  ),
) as { date?: string }
assert.match(String(timed.date || ''), /^\d{4}-\d{2}-\d{2}$/)

const imageSrc = await import('node:fs').then((fs) =>
  fs.readFileSync(new URL('./deepseekChatImage.ts', import.meta.url), 'utf8'),
)
assert.match(imageSrc, /CHAT_IMAGE_TIMEOUT_MS/, 'Image gen has timeout')
assert.match(imageSrc, /signalWithTimeout|AbortSignal\.timeout/, 'Image gen aborts on deadline')

console.log('deepseekChatTools.smoke: ok')
