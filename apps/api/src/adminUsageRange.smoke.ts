import assert from 'node:assert/strict'
import {
  defaultAdminUsageRange,
  monthKeysInRange,
  parseAdminUsageRange,
  sumUsageSnapshots,
} from './adminUsageRange.js'
import { emptyUsage } from './usage.js'

const def = defaultAdminUsageRange()
assert.match(def.from, /^\d{4}-\d{2}-01$/, 'default from is month start')
assert.match(def.to, /^\d{4}-\d{2}-\d{2}$/, 'default to is YMD')

assert.deepEqual(monthKeysInRange('2026-09-01', '2026-09-15'), ['2026_09'])
assert.deepEqual(monthKeysInRange('2026-08-15', '2026-09-15'), ['2026_08', '2026_09'])

const parsed = parseAdminUsageRange({ from: '2026-01-01', to: '2026-03-15' })
assert.equal(parsed.from, '2026-01-01')
assert.equal(parsed.to, '2026-03-15')
assert.deepEqual(parsed.months, ['2026_01', '2026_02', '2026_03'])

const legacy = parseAdminUsageRange({ month: '2026_09' })
assert.equal(legacy.months.length, 1)
assert.equal(legacy.months[0], '2026_09')

const summed = sumUsageSnapshots([
  { ...emptyUsage('2026_08'), liveSeconds: 60, ttsChars: 100 },
  { ...emptyUsage('2026_09'), liveSeconds: 30, ttsChars: 50 },
])
assert.equal(summed.liveSeconds, 90)
assert.equal(summed.ttsChars, 150)

console.log('adminUsageRange.smoke: ok')
