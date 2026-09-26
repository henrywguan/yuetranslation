/**
 * Offline smoke for Practice Partner lab UI polish (no browser / paid APIs).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const tsx = readFileSync(join(root, 'AdminPracticePartnerLab.tsx'), 'utf8')
const css = readFileSync(join(root, 'AdminPracticePartnerLab.css'), 'utf8')

assert.match(tsx, /Begin drill! Follow along with the practice partner and advance!/)
assert.match(tsx, /Follow along! The practice partner will start off and repeat\./)
assert.match(tsx, /Choose topic/)
assert.match(tsx, /Change topic/)
assert.match(tsx, /partner-lab--topic/)
assert.match(tsx, /partner-lab-topic-list/)
assert.match(tsx, /partner-lab-scores-crown|CROWN_ICON/)
assert.match(tsx, /old-falcon-43|popup-window/)
assert.match(tsx, /is-pulse/)
assert.doesNotMatch(tsx, /partner-lab-bottom/)
assert.doesNotMatch(tsx, /partner-lab-compose/)
assert.doesNotMatch(tsx, /Tap Begin drill\. No trophies\./)
assert.doesNotMatch(tsx, /speakerName[\s\S]*'Lab'/)
assert.match(
  tsx,
  /const speakerName\s*=\s*\n?\s*displayPrimary\.role === 'you' \? 'You' : partnerSpeaker/,
)

assert.match(css, /partner-lab-talk-pulse/)
assert.match(css, /partner-lab-crown-spark/)
assert.match(css, /partner-lab-topic-list/)
assert.doesNotMatch(css, /\.partner-lab-compose\s*\{/)
assert.doesNotMatch(css, /\.partner-lab-bottom\s*\{/)

console.log('AdminPracticePartnerLab.ui.smoke: ok')
