/**
 * Offline smoke for the kept-line bank (no network).
 */
import assert from 'node:assert/strict'
import {
  PARTNER_LINES_MAX,
  beginPartnerSitting,
  emptyPartnerSitting,
  linesForCategory,
  rememberPartnerLine,
  rememberPartnerMiss,
  reviewBankForCategory,
  sanitizePartnerSitting,
} from './practicePartnerSitting.ts'

const first = rememberPartnerLine(emptyPartnerSitting(), {
  en: 'hello',
  zh: '你好',
  jyutping: 'nei5 hou2',
  category: 'common',
  at: 1,
})
const second = rememberPartnerLine(first, {
  en: 'hello',
  zh: '你好',
  jyutping: 'nei5 hou2',
  category: 'common',
  at: 2,
})
assert.equal(second.lines.length, 1, 'the same line is kept once')
assert.equal(second.lines[0]?.at, 2, 'a repeat moves to the front of the recent window')
assert.equal(second.sessionLines.length, 1)

const foods = rememberPartnerLine(second, {
  en: 'water',
  zh: '水',
  jyutping: 'seoi2',
  category: 'foods',
  at: 3,
})
assert.deepEqual(
  linesForCategory(foods.lines, 'foods').map((row) => row.zh),
  ['水'],
)
assert.equal(reviewBankForCategory(foods.lines, 'common')[0]?.zh, '你好')

const missed = rememberPartnerMiss(foods, { said: 'nay ho', zh: '你好', en: 'hello', at: 4 })
assert.equal(missed.misses.length, 1)
const fresh = beginPartnerSitting(missed)
assert.equal(fresh.sessionLines.length, 0)
assert.equal(fresh.misses.length, 0)
assert.equal(fresh.lines.length, 2, 'the bank survives a new sitting')

const dirty = sanitizePartnerSitting({
  lines: [
    { en: '  hi ', zh: '  嗨 ', jyutping: 'haai1', category: 'common', at: 1 },
    { en: '', zh: '缺', jyutping: 'kyut3' },
  ],
  misses: [{ said: '   ', zh: '嗨', en: 'hi' }],
})
assert.equal(dirty.lines.length, 1)
assert.equal(dirty.lines[0]?.zh, '嗨')
assert.equal(dirty.misses.length, 0)

const many = Array.from({ length: PARTNER_LINES_MAX + 5 }, (_, i) => ({
  en: `line ${i}`,
  zh: `字${i}`,
  jyutping: 'zi6',
  category: 'common',
  at: i,
}))
const capped = sanitizePartnerSitting({ lines: many })
assert.equal(capped.lines.length, PARTNER_LINES_MAX)
assert.equal(capped.lines[0]?.zh, `字${5}`)

console.log('practicePartnerSitting.smoke: ok')
