/**
 * Offline guard: dead Solo / landing / Practice Partner CSS stays gone.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appCss = readFileSync(join(here, '../App.css'), 'utf8')
const landingCss = readFileSync(join(here, '../landing/landing.css'), 'utf8')
const partnerCss = readFileSync(join(here, '../components/AdminPracticePartnerLab.css'), 'utf8')
const craft = readFileSync(join(here, '../landing/learn/harborCraft.ts'), 'utf8')
const fishing = readFileSync(join(here, '../landing/learn/harborFishing.ts'), 'utf8')
const glb = readFileSync(join(here, '../landing/learn/harborProtagonistGlb.ts'), 'utf8')
const progress = readFileSync(join(here, '../landing/learn/progress.ts'), 'utf8')
const ladder = readFileSync(join(here, 'practicePartnerLadder.ts'), 'utf8')

assert.doesNotMatch(appCss, /\.opt-row\b/, 'legacy Solo opt-row CSS removed')
assert.doesNotMatch(appCss, /\.dir-switch\b/, 'legacy dir-switch CSS removed')
assert.doesNotMatch(appCss, /\.brand-pair\b/, 'legacy brand-pair CSS removed')
assert.doesNotMatch(appCss, /\.solo-source\b/, 'legacy solo-source CSS removed')
assert.match(appCss, /\.account-hub-autospeak-switch/, 'Account Hub autospeak switch CSS kept')

assert.doesNotMatch(landingCss, /\.hero-object\b/, 'unused hero-object CSS removed')
assert.doesNotMatch(landingCss, /\.demo-input-row\b/, 'unused demo-input-row CSS removed')
assert.doesNotMatch(landingCss, /\.ln-price-card__tip\b/, 'unused price tip CSS removed')

assert.doesNotMatch(partnerCss, /\.partner-path-dot\b/, 'superseded path-dot CSS removed')
assert.doesNotMatch(partnerCss, /\.partner-lab-mood\b/, 'superseded mood chooser CSS removed')
assert.doesNotMatch(partnerCss, /\.wuxia-beacon\b/, 'unused wuxia-beacon CSS removed')

assert.doesNotMatch(craft, /hqThatchTexture|hqGuanSandTexture/, 'deprecated craft texture aliases removed')
assert.doesNotMatch(fishing, /nearestGuanFishSpot/, 'deprecated Guan fish-spot alias removed')
assert.doesNotMatch(glb, /HARBOR_CANOE_GLB_SINK_Y|isHarborScoutGlbCached/, 'deprecated Scout sink helpers removed')
assert.doesNotMatch(progress, /export function resetHarborProgress|export function setHarborLocalUsername/, 'unused Harbor progress helpers removed')
assert.doesNotMatch(ladder, /export function resolvePracticePartnerMove/, 'unused web ladder move resolver removed')

console.log('codeCleanup.smoke: ok')
