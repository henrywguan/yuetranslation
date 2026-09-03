import assert from 'node:assert/strict'
import { usageBarWidthPct, usageRingFill } from './usageMeterMath.ts'

// 34s / 8h — must not round to an empty bar.
const camRatio = 34 / (8 * 3600)
assert.equal(usageBarWidthPct(camRatio, false, 34), 1.5)

// 5m12s / 60m — should track real usage, not snap to 0.
const liveRatio = (5 * 60 + 12) / (60 * 60)
assert.ok(usageBarWidthPct(liveRatio, false, 312) > 8)
assert.ok(usageBarWidthPct(liveRatio, false, 312) < 9)

// Unlimited meters keep a small decorative width when used > 0.
assert.equal(usageBarWidthPct(null, true, 62), 12)
assert.equal(usageBarWidthPct(null, true, 0), 0)

// Ring fill uses used/limit, not remaining/limit.
assert.ok(Math.abs(usageRingFill(liveRatio, false, 312) - liveRatio) < 0.001)
assert.ok(usageRingFill(liveRatio, false, 312) < 0.1)

console.log('usageMeterMath.smoke: ok')
