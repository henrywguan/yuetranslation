import assert from 'node:assert/strict'
import { missReasonFallback } from './practicePartnerMissReason.ts'

assert.match(missReasonFallback('I want tea', 'seoi2'), /English/)
assert.match(missReasonFallback('水', 'seoi2'), /seoi2/)
assert.match(missReasonFallback('水', 'seoi2'), /˧˥/)
assert.equal(missReasonFallback('水', ''), '')

console.log('practicePartnerMissReason.smoke: ok')