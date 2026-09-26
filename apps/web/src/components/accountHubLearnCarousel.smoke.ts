import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const carousel = readFileSync(join(root, 'AccountHubLearnCarousel.tsx'), 'utf8')
const plan = readFileSync(join(root, 'PlanChip.tsx'), 'utf8')
const partner = readFileSync(join(root, 'PracticePartnerAccountLaunch.tsx'), 'utf8')
const routes = readFileSync(join(root, '../lib/useHashRoute.ts'), 'utf8')
const links = readFileSync(join(root, '../lib/siteLinks.ts'), 'utf8')

assert.match(plan, /AccountHubLearnCarousel/, 'Account Hub header hosts the learn carousel')
assert.doesNotMatch(
  plan,
  /<HarborQuestAccountLaunch/,
  'Harbor Quest is no longer a lone header button',
)
assert.match(carousel, /PracticePartnerAccountLaunch/, 'Carousel includes Practice Partner')
assert.match(carousel, /HarborQuestAccountLaunch/, 'Carousel includes Harbor Quest')
assert.match(carousel, /account-hub-learn-arrow/, 'Left / right arrows switch the selection')
assert.match(carousel, /SWIPE_PX/, 'Horizontal swipe also switches the selection')
assert.match(partner, /openPracticePartner/, 'Practice Partner launcher opens #/practice')
assert.match(routes, /'practice'/, 'Hash router knows #/practice')
assert.match(links, /navigate\('practice'\)/, 'openPracticePartner navigates to #/practice')

console.log('accountHubLearnCarousel.smoke: ok')
