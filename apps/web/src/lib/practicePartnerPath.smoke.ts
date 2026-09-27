/**
 * Offline smoke for the Practice Partner course path.
 */
import assert from 'node:assert/strict'
import {
  PATH_LESSONS_PER_UNIT,
  PATH_MASTERY_MAX,
  PATH_SCORE_MAX,
  PRACTICE_PARTNER_PATH_KEY,
  bandForHarborScore,
  creditPracticePartnerPath,
  emptyPracticePartnerPath,
  harborScore,
  pathComplete,
  pathFocusSection,
  pathSectionComplete,
  practicePartnerUnitForMove,
  sanitizePracticePartnerPath,
} from './practicePartnerPath.ts'

assert.equal(PRACTICE_PARTNER_PATH_KEY, 'yue-practice-partner-path-v1')
assert.equal(practicePartnerUnitForMove('repeat'), 0)
assert.equal(practicePartnerUnitForMove('listen'), 1)
assert.equal(practicePartnerUnitForMove('translate'), 1)
assert.equal(practicePartnerUnitForMove('finish'), 2)

const empty = emptyPracticePartnerPath()
assert.equal(harborScore(empty), 0)
assert.equal(bandForHarborScore(0).cefr, 'A1')
assert.equal(pathFocusSection(empty), 'common')
assert.equal(pathComplete(empty), false)

let state = empty
const first = creditPracticePartnerPath(state, 'common', 'repeat')
assert.equal(first.next.units.common[0], 1)
assert.equal(first.note, null)
assert.equal(first.fresh?.index, 0)
assert.equal(harborScore(first.next), Math.floor(29 / 12))
state = first.next

for (let i = 1; i < PATH_LESSONS_PER_UNIT; i += 1) {
  const step = creditPracticePartnerPath(state, 'common', 'repeat')
  state = step.next
}
assert.equal(state.units.common[0], PATH_LESSONS_PER_UNIT)
assert.equal(pathSectionComplete(state, 'common'), false)
const unitClear = creditPracticePartnerPath(
  {
    ...state,
    units: { ...state.units, common: [3, 0, 0] },
  },
  'common',
  'repeat',
)
assert.equal(unitClear.note?.kind, 'unit')
assert.equal(unitClear.note && 'label' in unitClear.note ? unitClear.note.label : '', 'With me')

function fillSection(id: 'common' | 'foods' | 'animals' | 'expert', start: typeof state) {
  let next = start
  const moves = ['repeat', 'listen', 'finish'] as const
  for (const move of moves) {
    for (let i = 0; i < PATH_LESSONS_PER_UNIT; i += 1) {
      const step = creditPracticePartnerPath(next, id, move)
      next = step.next
      if (i === PATH_LESSONS_PER_UNIT - 1 && move === 'finish') {
        assert.equal(step.note?.kind, 'section')
      }
    }
  }
  assert.equal(pathSectionComplete(next, id), true)
  return next
}

state = fillSection('common', emptyPracticePartnerPath())
assert.equal(harborScore(state), 29)
assert.equal(bandForHarborScore(harborScore(state)).cefr, 'A1')

const foodsIgnored = creditPracticePartnerPath(emptyPracticePartnerPath(), 'expert', 'finish')
assert.equal(foodsIgnored.next.units.expert[2], 1)
assert.equal(harborScore(foodsIgnored.next), 0)

const enteredEveryday = creditPracticePartnerPath(state, 'foods', 'repeat')
assert.ok(harborScore(enteredEveryday.next) >= 30)
assert.ok(harborScore(enteredEveryday.next) < 59)
assert.equal(bandForHarborScore(harborScore(enteredEveryday.next)).cefr, 'A2')

state = fillSection('foods', state)
assert.equal(harborScore(state), 59)
assert.equal(bandForHarborScore(59).cefr, 'A2')

state = fillSection('animals', state)
assert.equal(harborScore(state), 99)
assert.equal(bandForHarborScore(99).cefr, 'B1')

state = fillSection('expert', state)
assert.equal(pathComplete(state), true)
assert.equal(harborScore(state), 129)
assert.equal(bandForHarborScore(129).cefr, 'B2')

const mastery = creditPracticePartnerPath(state, 'expert', 'repeat')
assert.equal(mastery.note?.kind, 'mastery')
assert.equal(harborScore(mastery.next), 130)
assert.equal(bandForHarborScore(130).cefr, 'C1')

let topped = mastery.next
for (let i = 0; i < 80; i += 1) {
  topped = creditPracticePartnerPath(topped, 'common', 'finish').next
}
assert.equal(topped.mastery, PATH_MASTERY_MAX)
assert.equal(harborScore(topped), PATH_SCORE_MAX)

const dirty = sanitizePracticePartnerPath({
  mastery: 99,
  units: { common: [9, -3, '4'], foods: 'nope' },
})
assert.deepEqual(dirty.units.common, [4, 0, 4])
assert.deepEqual(dirty.units.foods, [0, 0, 0])
assert.equal(dirty.mastery, PATH_MASTERY_MAX)

const fullUnit = creditPracticePartnerPath(unitClear.next, 'common', 'repeat')
assert.equal(fullUnit.next.units.common[0], PATH_LESSONS_PER_UNIT)
assert.equal(fullUnit.fresh, null)

console.log('practicePartnerPath.smoke: ok')
