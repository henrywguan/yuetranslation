/**
 * Solo typed translate must seed enInterim/yueInterim immediately so the source
 * pane does not blank while `translating` disables history fallback.
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
  /if \(!isFace\)[\s\S]*enInterim: text[\s\S]*yueInterim: text/,
  'Solo runTranslation must seed source interim before awaiting the model',
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
