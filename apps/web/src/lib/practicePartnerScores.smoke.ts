/**
 * Offline smoke for Practice Partner high-score log (no browser required).
 */
import assert from 'node:assert/strict'
import {
  PRACTICE_PARTNER_SCORES_KEY,
  PRACTICE_PARTNER_SCORES_MAX,
  applyPracticePartnerPass,
  emptyPracticePartnerScores,
  sanitizePracticePartnerScores,
} from './practicePartnerScores.ts'

assert.equal(PRACTICE_PARTNER_SCORES_KEY, 'yue-practice-partner-scores-v1')
assert.equal(PRACTICE_PARTNER_SCORES_MAX, 40)

const empty = emptyPracticePartnerScores()
assert.deepEqual(empty, { bestStreak: 0, totalPasses: 0, recent: [] })

const first = applyPracticePartnerPass(empty, {
  at: 1_700_000_000_000,
  streak: 1,
  category: 'animals',
  zh: '狗',
  en: 'dog',
})
assert.equal(first.totalPasses, 1)
assert.equal(first.bestStreak, 1)
assert.equal(first.recent[0]?.zh, '狗')
assert.equal(first.recent[0]?.category, 'animals')

const second = applyPracticePartnerPass(first, {
  at: 1_700_000_100_000,
  streak: 2,
  category: 'foods',
  zh: '叉燒飯',
  en: 'char siu rice',
})
assert.equal(second.totalPasses, 2)
assert.equal(second.bestStreak, 2)
assert.equal(second.recent[0]?.zh, '叉燒飯', 'newest pass is first')
assert.equal(second.recent[1]?.zh, '狗')

const brokenStreak = applyPracticePartnerPass(second, {
  streak: 1,
  category: 'common',
  zh: '對唔住',
  en: 'sorry',
})
assert.equal(brokenStreak.bestStreak, 2, 'best streak is monotonic')
assert.equal(brokenStreak.totalPasses, 3)

const junk = sanitizePracticePartnerScores({
  bestStreak: -4,
  totalPasses: 'nope',
  recent: [{ zh: '', en: '' }, { zh: '貓', category: 'sports', streak: 3 }],
})
assert.equal(junk.bestStreak, 3, 'best streak recovered from the log')
assert.equal(junk.recent[0]?.category, 'common', 'unknown decks fall back to common')
assert.equal(junk.recent.length, 1, 'empty rows dropped')

const overflow = Array.from({ length: 50 }, (_, i) => ({
  at: i,
  streak: 1,
  category: 'expert' as const,
  zh: `線${i}`,
  en: `line ${i}`,
}))
let piled = emptyPracticePartnerScores()
for (const row of overflow) piled = applyPracticePartnerPass(piled, row)
assert.equal(piled.recent.length, PRACTICE_PARTNER_SCORES_MAX)
assert.equal(piled.totalPasses, 50)
assert.match(piled.recent[0]?.zh || '', /線49/)

console.log('practicePartnerScores.smoke: ok')
