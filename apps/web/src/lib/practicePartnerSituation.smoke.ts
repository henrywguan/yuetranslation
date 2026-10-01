import assert from 'node:assert/strict'
import {
  PRACTICE_PARTNER_SITUATIONS,
  practicePartnerSituation,
} from './practicePartnerSituation.ts'

assert.deepEqual(
  PRACTICE_PARTNER_SITUATIONS.map((row) => row.id),
  ['cafe', 'mtr', 'favor', 'disagree'],
)
assert.equal(practicePartnerSituation('cafe')?.placeZh, '茶餐廳')
assert.equal(practicePartnerSituation('mtr')?.placeEn, 'MTR')
assert.equal(practicePartnerSituation('nope'), null)

console.log('practicePartnerSituation.smoke: ok')
