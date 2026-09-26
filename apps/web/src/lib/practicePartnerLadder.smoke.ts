/**
 * Offline ladder for Practice Partner (no DeepSeek / Azure).
 */
import assert from 'node:assert/strict'
import {
  finishLineCloze,
  practicePartnerCardShows,
  planPracticePartnerAdvance,
  practicePartnerMoveForPasses,
  practicePartnerReviewDue,
  practicePartnerXpForPass,
} from './practicePartnerLadder.js'

assert.equal(practicePartnerMoveForPasses(0), 'repeat')
assert.equal(practicePartnerMoveForPasses(1), 'listen')
assert.equal(practicePartnerMoveForPasses(2), 'translate')
assert.equal(practicePartnerMoveForPasses(3), 'finish')
assert.equal(practicePartnerMoveForPasses(8), 'finish')

assert.equal(practicePartnerReviewDue(2, 2), false)
assert.equal(practicePartnerReviewDue(3, 0), false)
assert.equal(practicePartnerReviewDue(3, 2), true)
assert.equal(practicePartnerReviewDue(6, 1), true)
const planned = planPracticePartnerAdvance(2, [
  { en: 'dog', zh: '狗', jyutping: 'gau2' },
  { en: 'cat', zh: '貓', jyutping: 'maau1' },
])
assert.equal(planned.nextMove, 'finish')
assert.equal(planned.review?.zh, '狗')
assert.equal(planPracticePartnerAdvance(0, []).review, null)

assert.equal(practicePartnerXpForPass('repeat', false), 10)
assert.equal(practicePartnerXpForPass('finish', false), 25)
assert.equal(practicePartnerXpForPass('listen', true), 20)

assert.equal(finishLineCloze('狗'), null)
assert.equal(finishLineCloze('我要凍檸檬茶，少甜'), '我要凍檸檬茶，……')
assert.match(finishLineCloze('唔該，呢個幾多錢？') || '', /……$/)

assert.deepEqual(practicePartnerCardShows('repeat', 'mainlander'), {
  zh: 'full',
  en: true,
  jp: true,
})
assert.deepEqual(practicePartnerCardShows('listen', 'new_learner'), {
  zh: 'hidden',
  en: false,
  jp: false,
})
assert.equal(practicePartnerCardShows('translate', 'new_learner').zh, 'full')
assert.equal(practicePartnerCardShows('translate', 'abc').zh, 'hidden')
assert.equal(practicePartnerCardShows('translate', 'abc').en, true)
assert.equal(practicePartnerCardShows('finish', 'mainlander').en, false)
assert.equal(practicePartnerCardShows('finish', 'abc').zh, 'cloze')
assert.equal(practicePartnerCardShows('finish', 'abc', false).zh, 'hidden')
assert.equal(practicePartnerCardShows('finish', 'abc', false).en, true)

console.log('practicePartnerLadder.smoke: ok')
