import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Lang } from '../lib/types'
import { SUPPORTED_LANG_CARDS } from './supportedLangs'

const ALL: Lang[] = [
  'en',
  'yue',
  'cmn',
  'wuu',
  'sichuan',
  'tl',
  'es',
  'eses',
  'vi',
  'ceb',
  'ilo',
  'bcl',
]

const here = dirname(fileURLToPath(import.meta.url))
const landing = readFileSync(join(here, 'Landing.tsx'), 'utf8')
const marquee = readFileSync(join(here, 'LangMarquee.tsx'), 'utf8')
const tip = readFileSync(join(here, 'HeroMultilangTip.tsx'), 'utf8')
const css = readFileSync(join(here, 'landing.css'), 'utf8')
const pricing = readFileSync(join(here, 'PricingPage.tsx'), 'utf8')
const creators = readFileSync(join(here, 'CreatorsPage.tsx'), 'utf8')
const timeline = readFileSync(join(here, 'CreatorsTraceTimeline.tsx'), 'utf8')
const creatorsCss = readFileSync(join(here, 'creators.css'), 'utf8')
const planChip = readFileSync(join(here, '../components/PlanChip.tsx'), 'utf8')
const stateful = readFileSync(join(here, '../components/StatefulButton.tsx'), 'utf8')

assert.equal(SUPPORTED_LANG_CARDS.length, 12, 'All 12 Solo/Cam langs on the marquee')
assert.deepEqual(
  [...SUPPORTED_LANG_CARDS.map((c) => c.id)].sort(),
  [...ALL].sort(),
  'Marquee ids match Lang',
)
assert.equal(SUPPORTED_LANG_CARDS.filter((c) => !c.voice).length, 3, 'Cebuano / Ilocano / Bikol are Type chips')

assert.match(landing, /<LangMarquee/, 'Home hosts the infinite language strip')
assert.match(tip, /SUPPORTED_LANG_CARDS/, 'Hero tip cycles the same 12 langs')
assert.match(css, /ln-lang-marquee-scroll/, 'Marquee uses Harbor CSS motion, not Tailwind')
assert.match(css, /prefers-reduced-motion: reduce/, 'Marquee stills for reduced motion')

assert.match(pricing, /StatefulButton/, 'Pricing checkout is stateful')
assert.match(pricing, /checkoutOpening/, 'Checkout shows Opening checkout… while Stripe loads')
assert.match(planChip, /StatefulButton/, 'Account Hub username Save is stateful')
assert.match(planChip, /accountUsernameSaved/, 'Save flashes Saved before the field closes')
assert.match(stateful, /phase === 'loading'/, 'Stateful button has a loading phase')

assert.match(creators, /CreatorsTraceTimeline/, 'Creators copy steps use the tracing beam')
assert.match(timeline, /creators-trace-fill/, 'Beam fill follows scroll')
assert.match(creatorsCss, /creators-trace-rail/, 'Tracing rail is Harbor CSS')

for (const src of [marquee, stateful, timeline, css, creatorsCss]) {
  assert.doesNotMatch(src, /tailwind|@\/components\/ui/, 'No Tailwind / shadcn')
}

console.log('aceternityHarbor.smoke: ok')
