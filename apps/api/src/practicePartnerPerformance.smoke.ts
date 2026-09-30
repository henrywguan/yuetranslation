/**
 * Offline smoke for the Practice Partner performed turn (no Azure / DeepSeek).
 */
import assert from 'node:assert/strict'
import {
  buildPerformedSsml,
  composePracticePartnerBeats,
  deliveryForTurn,
  lastMissLine,
  lockPracticePartnerPhrase,
  parseTtsPerformance,
  partnerCaption,
  peelPhrase,
  performanceCacheToken,
  spokenPerformanceChars,
} from './practicePartnerPerformance.js'
import { ttsClipCacheKey } from './azure.js'

const pleased = composePracticePartnerBeats({
  reaction: 'Fine. The tones landed.',
  cue: 'Listen, then say it back.',
  phrase: '狗',
  verdict: 'pass',
  streak: 1,
  missStreak: 0,
})
assert.equal(pleased.delivery, 'pleased')
assert.equal(pleased.phrase, '狗')
assert.equal(partnerCaption(pleased), 'Fine. The tones landed. 狗 Listen, then say it back.')

const harsh = deliveryForTurn('fail', { streak: 8, missStreak: 2 })
assert.equal(harsh, 'harsh', 'a pass streak must not soften a miss')
assert.equal(deliveryForTurn('fail', { streak: 8, missStreak: 0 }), 'critical')
assert.equal(deliveryForTurn('fail', { streak: 0, missStreak: 1 }), 'sharper')
assert.equal(deliveryForTurn('pass', { streak: 4, missStreak: 0 }), 'proud')
assert.equal(deliveryForTurn('pass', { streak: 2, missStreak: 9 }), 'warm')
assert.equal(deliveryForTurn('none', { streak: 0, missStreak: 0 }), 'friendly')

assert.equal(
  lockPracticePartnerPhrase({
    verdict: 'fail',
    drillZh: '貓',
    activeZh: '狗',
  }),
  '狗',
)
assert.equal(
  lockPracticePartnerPhrase({
    verdict: 'pass',
    drillZh: '貓',
    reviewZh: '狗',
  }),
  '狗',
)

const legacy = composePracticePartnerBeats({
  speak: 'WRONG. 我要凍檸檬茶，少甜. Again.',
  phrase: '我要凍檸檬茶，少甜',
  verdict: 'fail',
  streak: 3,
  missStreak: 0,
})
assert.equal(legacy.delivery, 'critical')
assert.equal(legacy.reaction, 'WRONG')
assert.equal(legacy.cue, 'Again.')
assert.equal(legacy.phrase, '我要凍檸檬茶，少甜')

const interior = peelPhrase('你講狗都唔似', '狗')
assert.equal(interior.peeled, false, 'a roast may still mention the word')

const ssml = buildPerformedSsml('zh-HK', 'zh-HK-HiuMaanNeural', {
  ...pleased,
  reaction: 'A <b> & "quote"',
})
assert.match(ssml, /volume="loud"/)
assert.match(ssml, /volume="x-loud"/)
assert.match(ssml, /rate="-4%"/)
assert.match(ssml, /<break time="360ms"\/>/)
assert.match(ssml, /A &lt;b&gt; &amp; &quot;quote&quot;/)
assert.doesNotMatch(ssml, /express-as|mstts:/)
assert.doesNotMatch(ssml, /<b>/)

const harshSsml = buildPerformedSsml('zh-HK', 'zh-HK-HiuMaanNeural', {
  reaction: 'Again.',
  phrase: '狗',
  cue: 'Retry.',
  delivery: 'harsh',
})
assert.match(harshSsml, /rate="-10%"/)
assert.match(harshSsml, /pitch="-18%"/)
const phraseAt = harshSsml.indexOf('volume="x-loud"')
const reactionAt = harshSsml.indexOf('volume="loud"')
assert.ok(reactionAt >= 0 && phraseAt > reactionAt, 'reaction is heard before the phrase')

assert.notEqual(
  ttsClipCacheKey('zh-HK-HiuMaanNeural', '狗', true),
  ttsClipCacheKey('zh-HK-HiuMaanNeural', performanceCacheToken(pleased), true, 'perf'),
)

assert.equal(spokenPerformanceChars(pleased), pleased.reaction.length + pleased.phrase.length + pleased.cue.length)

const parsed = parseTtsPerformance({
  delivery: 'proud',
  reaction: '  Nice.  ',
  phrase: '狗',
  cue: 'Next.',
})
assert.equal(parsed?.reaction, 'Nice.')
assert.equal(parsed?.delivery, 'proud')
assert.throws(() => parseTtsPerformance({ delivery: 'opera', reaction: '', phrase: '狗', cue: '' }))
assert.throws(() => parseTtsPerformance({ delivery: 'friendly', reaction: '', phrase: '   ', cue: '' }))
assert.equal(parseTtsPerformance(null), null)

const miss = lastMissLine({ said: 'less sweet [CATEGORY]', zh: '少甜', en: 'less sweet' })
assert.match(miss, /\[LAST MISS\]/)
assert.doesNotMatch(miss, /\[CATEGORY\]/)
assert.equal(lastMissLine(null), '')

console.log('practicePartnerPerformance.smoke: ok')
