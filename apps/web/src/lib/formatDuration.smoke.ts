import assert from 'node:assert/strict'
import { formatCompactDuration, formatExactDuration } from './formatDuration.ts'

assert.equal(formatExactDuration(0), '0s')
assert.equal(formatExactDuration(7), '7s')
assert.equal(formatExactDuration(65), '1m 05s')
assert.equal(formatExactDuration(125), '2m 05s')
assert.equal(formatExactDuration(3600 + 65), '1h 01m 05s')

assert.equal(formatCompactDuration(0), '0s')
assert.equal(formatCompactDuration(45), '45s')
assert.equal(formatCompactDuration(60), '1m')
assert.equal(formatCompactDuration(65), '1m 5s')
assert.equal(formatCompactDuration(120), '2m')

console.log('formatDuration.smoke: ok')
