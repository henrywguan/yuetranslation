/**
 * Offline smoke for Practice Partner beat helpers (no TTS).
 */
import assert from 'node:assert/strict'
import {
  deliveryForPartnerTurn,
  partnerCaption,
  reactionHoldMs,
  retryChunk,
  withLockedPhrase,
} from './practicePartnerPerformance.ts'

assert.equal(deliveryForPartnerTurn('fail', { streak: 6, missStreak: 0 }), 'critical')
assert.equal(deliveryForPartnerTurn('fail', { streak: 0, missStreak: 2 }), 'harsh')
assert.equal(deliveryForPartnerTurn('pass', { streak: 4, missStreak: 1 }), 'proud')

assert.equal(retryChunk('狗'), '狗')
assert.equal(retryChunk('我要凍檸檬茶，少甜'), '我要凍檸檬茶')
assert.equal(retryChunk('你再唔走我就真係唔禮貌喇'), '你再唔走我就')

const locked = withLockedPhrase(
  { reaction: 'Again.', phrase: '貓', cue: 'Retry.', delivery: 'critical' },
  '狗',
)
assert.equal(locked.phrase, '狗')
assert.equal(partnerCaption(locked), 'Again. 狗 Retry.')
assert.ok(reactionHoldMs('Hello') >= 480)
assert.ok(reactionHoldMs('x'.repeat(200)) <= 4200)

console.log('practicePartnerPerformance.web.smoke: ok')
