/**
 * Offline smoke for Practice Partner beat helpers (no TTS).
 */
import assert from 'node:assert/strict'
import {
  deliveryForPartnerTurn,
  partnerCaption,
  partnerCaptionLayout,
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

const learner = partnerCaptionLayout({
  difficulty: 'new_learner',
  en: 'dog',
  zh: '狗',
  jyutping: 'gau2',
  reaction: 'Repeat after me.',
  cue: 'Your turn.',
  spoken: 'Repeat after me. 狗 Your turn.',
})
assert.equal(learner.primaryText, 'dog')
assert.equal(learner.coachText, 'Repeat after me. Your turn.')
assert.equal(learner.secondaryScript?.zh, '狗')
assert.equal(learner.secondaryScript?.jyutping, 'gau2')
assert.equal(learner.primaryScript, null)
assert.equal(learner.secondaryText, '')
assert.ok(!learner.primaryText.includes('狗'))
assert.ok(!learner.coachText.includes('狗'))

const abc = partnerCaptionLayout({
  difficulty: 'abc',
  en: 'iced lemon tea, less sweet',
  zh: '我要凍檸檬茶，少甜',
  jyutping: 'ngo5 jiu3 dung3 ning4 mung1 caa4 siu2 tim4',
  reaction: '再講一次。',
  cue: '而家輪到你。',
})
assert.equal(abc.secondaryText, 'iced lemon tea, less sweet')
assert.equal(abc.primaryScript?.zh, '我要凍檸檬茶，少甜')
assert.equal(abc.primaryScript?.jyutping, 'ngo5 jiu3 dung3 ning4 mung1 caa4 siu2 tim4')
assert.equal(abc.secondaryScript, null)
assert.match(abc.coachText, /再講一次/)
assert.ok(!abc.coachText.includes('少甜'))

const mainland = partnerCaptionLayout({
  difficulty: 'mainlander',
  en: 'dog',
  zh: '狗',
  jyutping: 'gau2',
  spoken: '跟住我講。狗',
})
assert.equal(mainland.primaryText, '跟住我講。狗')
assert.equal(mainland.primaryScript, null)
assert.equal(mainland.secondaryText, '')
assert.equal(mainland.secondaryScript, null)

console.log('practicePartnerPerformance.web.smoke: ok')
