import assert from 'node:assert/strict'
import { bootstrapRetryDelayMs } from './bootstrapRetry.ts'

assert.equal(bootstrapRetryDelayMs(1), 600)
assert.equal(bootstrapRetryDelayMs(2), 1_200)
assert.equal(bootstrapRetryDelayMs(3), 2_400)
assert.equal(bootstrapRetryDelayMs(4), 4_800)
assert.equal(bootstrapRetryDelayMs(5), 8_000)
assert.equal(bootstrapRetryDelayMs(9), 8_000)
assert.equal(bootstrapRetryDelayMs(0), 600)

console.log('bootstrapRetry.smoke ok')
