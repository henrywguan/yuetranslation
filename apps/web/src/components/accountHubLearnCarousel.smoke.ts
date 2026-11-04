import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const carousel = readFileSync(join(root, 'AccountHubLearnCarousel.tsx'), 'utf8')
const plan = readFileSync(join(root, 'PlanChip.tsx'), 'utf8')
const partner = readFileSync(join(root, 'PracticePartnerAccountLaunch.tsx'), 'utf8')
const chat = readFileSync(join(root, 'ChatAccountLaunch.tsx'), 'utf8')
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
assert.match(carousel, /ChatAccountLaunch/, 'Carousel includes DeepSeek Chat')
assert.match(carousel, /'chat'/, 'Carousel slide id includes chat')
assert.match(carousel, /account-hub-learn-arrow/, 'Left / right arrows switch the selection')
assert.match(carousel, /SWIPE_PX/, 'Horizontal swipe also switches the selection')
assert.match(partner, /openPracticePartner/, 'Practice Partner launcher opens #/practice')
assert.match(chat, /openDeepseekChat/, 'Chat launcher opens #/chat')
assert.match(chat, /openPricing/, 'Locked Free CTA opens pricing')
assert.match(
  chat,
  /if \(open\) \{\s*openDeepseekChat\(\)/s,
  'Unlocked chat navigates before closing Account Hub',
)
assert.match(routes, /'practice'/, 'Hash router knows #/practice')
assert.match(routes, /'chat'/, 'Hash router knows #/chat')
assert.match(links, /navigate\('practice'\)/, 'openPracticePartner navigates to #/practice')
assert.match(links, /navigate\('chat'\)/, 'openDeepseekChat navigates to #/chat')

const chatCss = readFileSync(join(root, '../pages/ChatPage.css'), 'utf8')
assert.match(chatCss, /position:\s*fixed/, '.ds-chat pins to the viewport like Practice')
assert.match(chatCss, /z-index:\s*120/, '.ds-chat stacks above Account Hub portal leftovers')

const app = readFileSync(join(root, '../App.tsx'), 'utf8')
assert.match(app, /key=\{route\}/, 'Suspense remounts per route so Account Hub cannot linger')
assert.match(app, /ds-chat-boot/, 'Chat route shows a fixed boot shell while lazy-loading')

console.log('accountHubLearnCarousel.smoke: ok')
