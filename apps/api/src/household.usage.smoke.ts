import assert from 'node:assert/strict'
import { emptyUsage } from './usage.js'
import { mergePooledWithPersonal } from './household.js'

const month = '2026_09'

assert.equal(
  mergePooledWithPersonal(
    { ...emptyUsage(month), liveSeconds: 120 },
    { ...emptyUsage(month), liveSeconds: 900 },
  ).liveSeconds,
  900,
  'overlap adopts higher personal total without double-counting pool',
)
assert.equal(
  mergePooledWithPersonal(emptyUsage(month), { ...emptyUsage(month), liveSeconds: 900 })
    .liveSeconds,
  900,
  'empty pool adopts personal sum',
)

console.log('household.usage.smoke: ok')
