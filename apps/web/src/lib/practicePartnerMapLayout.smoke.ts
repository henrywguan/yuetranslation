/**
 * Offline checks for the Ink Road scroll layout.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { emptyPracticePartnerPath } from './practicePartnerPath.ts'
import {
  PARTNER_MAP_HEIGHT,
  partnerMapLayerSize,
  practicePartnerChapterReveal,
  practicePartnerChapterTale,
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
assert.deepEqual(
  regions.map((row) => row.placeEn),
  ['Lantern Gate', 'Night Market', 'Bamboo Wilds', 'Cloud Terrace'],
)
assert.equal(scrolls.find((row) => row.category === 'common')?.mark, '山')
assert.equal(scrolls.find((row) => row.category === 'expert')?.mark, '雲')
assert.ok(practicePartnerMapFocusY('expert') > practicePartnerMapFocusY('common'))

assert.equal(practicePartnerChapterReveal(empty, 'foods'), 0)
assert.match(practicePartnerChapterTale(empty, 'common'), /stone gate/)
const opened = emptyPracticePartnerPath()
opened.units.common = [4, 4, 4]
assert.equal(practicePartnerChapterReveal(opened, 'common'), 1)
assert.match(practicePartnerChapterTale(opened, 'common'), /gate is open/)

const phone = partnerMapLayerSize(390, 700)
assert.equal(phone.w, 390)
assert.ok(phone.h >= 700 * PARTNER_MAP_HEIGHT - 0.5)
const desk = partnerMapLayerSize(900, 640)
assert.equal(desk.w, 900)
assert.ok(desk.h > 640)

const here = dirname(fileURLToPath(import.meta.url))
const layoutSrc = readFileSync(join(here, 'practicePartnerMapLayout.ts'), 'utf8')
const mapSrc = readFileSync(join(here, '../components/PracticePartnerPathMap.tsx'), 'utf8')
const artSrc = readFileSync(join(here, '../components/WuxiaJourneyArt.tsx'), 'utf8')
for (const src of [layoutSrc, mapSrc, artSrc]) {
  assert.doesNotMatch(src, /harbor-quest|harbor-continent|Guan harbor|voyage chart/i)
}

console.log('practicePartnerMapLayout.smoke: ok')
