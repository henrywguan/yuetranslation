import assert from 'node:assert/strict'
import {
  PRACTICE_PARTNER_GOALS,
  PRACTICE_PARTNER_PERSONALITIES,
  PRACTICE_PARTNER_SITUATION_GROUPS,
  PRACTICE_PARTNER_SITUATIONS,
  practicePartnerGoal,
  practicePartnerPersonality,
  practicePartnerSituation,
} from './practicePartnerSituation.ts'

assert.deepEqual(
  PRACTICE_PARTNER_SITUATION_GROUPS.map((row) => row.id),
  ['food', 'around', 'shopping', 'people', 'city'],
)
assert.equal(PRACTICE_PARTNER_SITUATIONS.length, 22)
assert.equal(practicePartnerSituation('cafe')?.placeZh, '茶餐廳')
assert.equal(practicePartnerSituation('dimsum')?.placeZh, '飲茶')
assert.equal(practicePartnerSituation('mtr')?.placeEn, 'MTR')
assert.equal(practicePartnerSituation('taxi')?.placeZh, '的士')
assert.equal(practicePartnerSituation('market')?.placeEn, 'Wet market')
assert.equal(practicePartnerSituation('occasion')?.placeZh, '香港節日')
assert.equal(practicePartnerSituation('favor')?.placeZh, '幫下手')
assert.equal(practicePartnerSituation('nope'), null)
assert.equal(practicePartnerSituation('debate'), null)
assert.deepEqual(
  PRACTICE_PARTNER_PERSONALITIES.map((row) => row.id),
  ['friendly', 'formal', 'busy', 'elder', 'counter'],
)
assert.equal(practicePartnerPersonality('busy')?.labelZh, '趕時間')
assert.deepEqual(
  PRACTICE_PARTNER_GOALS.map((row) => row.id),
  ['task', 'casual', 'fluency', 'slang'],
)
assert.equal(practicePartnerGoal('slang')?.labelEn, 'Local color')
assert.equal(practicePartnerGoal('exam'), null)

console.log('practicePartnerSituation.smoke: ok')
