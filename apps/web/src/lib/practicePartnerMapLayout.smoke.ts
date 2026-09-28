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
  PARTNER_MAP_VIEWBOX,
  partnerMapLayerSize,
  practicePartnerChapterReveal,
  practicePartnerChapterTale,
  practicePartnerMapFocusY,
  practicePartnerMapRegions,
  practicePartnerMapScrolls,
} from './practicePartnerMapLayout.ts'
import { LESSON_TALES, practicePartnerLessonCard, practicePartnerRegionCard } from './practicePartnerMapStory.ts'

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

function nearestStopPx(frameW: number, frameH: number) {
  const size = partnerMapLayerSize(frameW, frameH)
  let min = Infinity
  for (let i = 1; i < scrolls.length; i += 1) {
    const prev = scrolls[i - 1]
    const row = scrolls[i]
    if (!prev || !row || prev.category !== row.category) continue
    const dx = (row.x - prev.x) * size.w
    const dy = (row.y - prev.y) * size.h
    min = Math.min(min, Math.hypot(dx, dy))
  }
  return min
}
assert.ok(nearestStopPx(390, 640) >= 90, `phone gap ${nearestStopPx(390, 640)}`)
assert.ok(nearestStopPx(360, 520) >= 80, `short gap ${nearestStopPx(360, 520)}`)

assert.equal(practicePartnerChapterReveal(empty, 'foods'), 0)
assert.match(practicePartnerChapterTale(empty, 'common'), /stone gate/)
const opened = emptyPracticePartnerPath()
opened.units.common = [4, 4, 4]
assert.equal(practicePartnerChapterReveal(opened, 'common'), 1)
assert.match(practicePartnerChapterTale(opened, 'common'), /gate is open/)

const tales = scrolls.map((row) => practicePartnerLessonCard(row).tale)
assert.equal(tales.length, 48)
assert.equal(new Set(tales).size, 48)
for (const beats of Object.values(LESSON_TALES)) assert.equal(beats.length, 12)
const sealedCard = practicePartnerLessonCard(scrolls[0]!)
assert.equal(sealedCard.kicker.includes('Still ink'), true)
assert.match(sealedCard.before, /The drill has not started/)
assert.match(sealedCard.how, /港灣/)
const litScroll = colored.find((row) => row.colored)
assert.ok(litScroll)
assert.match(practicePartnerLessonCard(litScroll!).kicker, /Lit/)
assert.match(practicePartnerRegionCard(regions[0]!, empty).tale, /stone gate/)

const aspect = PARTNER_MAP_VIEWBOX.h / PARTNER_MAP_VIEWBOX.w
const phone = partnerMapLayerSize(390, 700)
assert.ok(phone.w >= 390)
assert.ok(phone.h >= 700 * PARTNER_MAP_HEIGHT - 0.5)
assert.ok(Math.abs(phone.h / phone.w - aspect) < 0.001)
const desk = partnerMapLayerSize(900, 640)
assert.equal(desk.w, 900)
assert.ok(desk.h > 640)
assert.ok(Math.abs(desk.h / desk.w - aspect) < 0.001)

const here = dirname(fileURLToPath(import.meta.url))
const layoutSrc = readFileSync(join(here, 'practicePartnerMapLayout.ts'), 'utf8')
const mapSrc = readFileSync(join(here, '../components/PracticePartnerPathMap.tsx'), 'utf8')
const artSrc = readFileSync(join(here, '../components/WuxiaJourneyArt.tsx'), 'utf8')
const depthSrc = readFileSync(join(here, '../components/WuxiaDepth.tsx'), 'utf8')
for (const src of [layoutSrc, mapSrc, artSrc, depthSrc]) {
  assert.doesNotMatch(src, /harbor-quest|harbor-continent|Guan harbor|voyage chart/i)
  assert.doesNotMatch(src, /feTurbulence|feGaussianBlur/)
}
assert.match(artSrc, /f3e2c4/)
assert.doesNotMatch(artSrc, /paperFiber/)
assert.match(artSrc, /preserveAspectRatio="none"/)
assert.match(artSrc, /PARTNER_MAP_VIEWBOX/)
assert.match(depthSrc, /WuxiaFarPeaks/)
assert.match(depthSrc, /WuxiaMistVeil/)
assert.match(mapSrc, /WuxiaFarPeaks/)
assert.match(mapSrc, /WuxiaCloudFrame/)
assert.match(mapSrc, /0\.38/)
assert.match(mapSrc, /1\.18/)
assert.match(mapSrc, /box\.cw \* pan\.scale/)
assert.doesNotMatch(mapSrc, /scale\(\$\{pan\.scale\}\)/)

console.log('practicePartnerMapLayout.smoke: ok')
