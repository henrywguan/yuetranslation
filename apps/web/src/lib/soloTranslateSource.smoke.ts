/**
 * Typed translate must seed speaking-side interim for every language/pane so
 * Solo (and Conversation) source text does not blank mid-flight.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const translateSrc = readFileSync(join(here, 'storeTranslate.ts'), 'utf8')
const soloSrc = readFileSync(join(here, '../components/SoloView.tsx'), 'utf8')
const toggleCss = readFileSync(join(here, '../bi.css'), 'utf8')

assert.match(
  translateSrc,
  /export function seedSpeakingSource/,
  'seedSpeakingSource helper must be exported for pane/you-side seeding',
)
assert.match(
  translateSrc,
  /seedSpeakingSource\(get, set, lang, text, isFace\)/,
  'runTranslation must seed before awaiting the model',
)
assert.match(
  translateSrc,
  /soloUpperLang[\s\S]*soloLowerLang[\s\S]*enInterim: text[\s\S]*yueInterim: text/,
  'Solo seed must key off upper/lower pane langs — not hardcoded English',
)
assert.match(
  translateSrc,
  /conversationYouLang[\s\S]*enInterim: text[\s\S]*yueInterim: text/,
  'Conversation seed must cover you + partner sides for any language pair',
)
assert.doesNotMatch(
  translateSrc.match(/function seedSpeakingSource[\s\S]*?\n\}/)?.[0] || '',
  /lang === ['"]en['"]/,
  'Speaking-source seed must not special-case English',
)

assert.match(
  soloSrc,
  /translating && prev\.trim\(\) && !String\(storeUpper\)\.trim\(\)/,
  'SoloView must not wipe a non-empty upper draft mid-translate',
)
assert.match(
  soloSrc,
  /translating && prev\.trim\(\) && !String\(storeLower\)\.trim\(\)/,
  'SoloView must not wipe a non-empty lower draft mid-translate',
)

assert.match(
  toggleCss,
  /\.canto-roman-toggle-btn\s*\{[^}]*display:\s*inline-flex/s,
  'Jyutping/Yale pills must center label inside the active chrome',
)
assert.match(
  toggleCss,
  /\.canto-roman-toggle-btn\s*\{[^}]*white-space:\s*nowrap/s,
  'Jyutping/Yale labels must not wrap outside the pill',
)

console.log('soloTranslateSource.smoke: ok')
