/**
 * Offline checks for the voyage-map scroll layout.
 */
import assert from 'node:assert/strict'
import { emptyPracticePartnerPath } from './practicePartnerPath.ts'
import {
  PARTNER_MAP_HEIGHT,
  partnerMapLayerSize,
  practicePartnerMapFocusY,
  practicePartnerMapRegions,
  practicePartnerMapScrolls,
} from './practicePartnerMapLayout.ts'

const empty = emptyPracticePartnerPath()
const scrolls = practicePartnerMapScrolls(empty)
assert.equal(scrolls.length, 48)
assert.equal(scrolls.filter((row) => row.colored).length, 0)
assert.ok(PARTNER_MAP_HEIGHT > 1.8)

const commonY = scrolls.filter((row) => row.category === 'common').map((row) => row.y)
const expertY = scrolls.filter((row) => row.category === 'expert').map((row) => row.y)
assert.ok(Math.max(...commonY) < Math.min(...expertY))

for (const row of scrolls) {
  assert.ok(row.x >= 0.1 && row.x <= 0.9)
  assert.ok(row.y >= 0.04 && row.y <= 0.97)
}

const filled = emptyPracticePartnerPath()
filled.units.common = [2, 0, 0]
const colored = practicePartnerMapScrolls(filled, {
  category: 'common',
  unit: 0,
  index: 1,
})
assert.equal(colored.filter((row) => row.colored).length, 2)
assert.equal(colored.filter((row) => row.fresh).length, 1)

const regions = practicePartnerMapRegions()
assert.deepEqual(
  regions.map((row) => row.id),
  ['common', 'foods', 'animals', 'expert'],
)
assert.ok(practicePartnerMapFocusY('expert') > practicePartnerMapFocusY('common'))

const phone = partnerMapLayerSize(390, 700)
assert.ok(phone.h >= 700 * PARTNER_MAP_HEIGHT - 0.5)
assert.ok(phone.w > 390)
const desk = partnerMapLayerSize(900, 640)
assert.ok(desk.h > 640)
assert.ok(desk.w > 900)

console.log('practicePartnerMapLayout.smoke: ok')
