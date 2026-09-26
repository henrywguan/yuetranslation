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
assert.match(tsx, /Choose difficulty & topic/)
assert.match(tsx, /Change topic/)
assert.match(tsx, /partner-lab--topic/)
assert.match(tsx, /partner-lab-topic-list/)
assert.match(tsx, /partner-lab-diff-list/)
assert.match(tsx, /PRACTICE_PARTNER_DIFFICULTIES/)
assert.match(tsx, /onDifficultyPick/)
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

assert.match(tsx, /bilingualYueEn:\s*true/)
assert.match(tsx, /playPracticePartnerFailSfx/)
assert.match(tsx, /partner-lab-fail-burst/)
assert.match(tsx, /prepareLoudTtsPlayback/)
assert.match(css, /partner-lab-fail-x/)
assert.match(css, /partner-lab-fail-edge-flash/)
assert.match(css, /is-fail-flash/)
assert.match(css, /partner-lab-talk-pulse/)
assert.match(css, /partner-lab-crown-spark/)
assert.match(css, /partner-lab-topic-list/)
assert.match(css, /partner-lab-diff-list/)
assert.match(css, /partner-lab-diff-item--mainlander/)
assert.doesNotMatch(css, /\.partner-lab-compose\s*\{/)
assert.doesNotMatch(css, /\.partner-lab-bottom\s*\{/)

const adminApi = readFileSync(join(root, '../lib/adminApi.ts'), 'utf8')
assert.match(adminApi, /id:\s*'new_learner'/)
assert.match(adminApi, /id:\s*'abc'/)
assert.match(adminApi, /id:\s*'mainlander'/)
assert.match(adminApi, /labelEn:\s*'New Learner'/)
assert.match(adminApi, /labelEn:\s*'Mainlander'/)
assert.match(adminApi, /difficulty:\s*resolvePracticePartnerDifficulty/)

console.log('AdminPracticePartnerLab.ui.smoke: ok')
