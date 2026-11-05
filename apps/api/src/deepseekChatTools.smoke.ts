import assert from 'node:assert/strict'
import {
  convertUnits,
  DEEPSEEK_CHAT_TOOLS,
  executeDeepseekChatTool,
  safeCalc,
} from './deepseekChatTools.js'

assert.ok(DEEPSEEK_CHAT_TOOLS.some((t) => t.function.name === 'get_date'))
assert.ok(DEEPSEEK_CHAT_TOOLS.some((t) => t.function.name === 'jyut_plan_limits'))
assert.ok(DEEPSEEK_CHAT_TOOLS.some((t) => t.function.name === 'fetch_url'))

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
}
assert.equal(limits.family.seats, 4)

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

console.log('deepseekChatTools.smoke: ok')
