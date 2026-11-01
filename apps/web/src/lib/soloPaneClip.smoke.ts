/**
 * Solo pane chrome must not clip the lang pill / mic highlight.
 * Scroll belongs on .solo-pane-scroll; panes stay overflow:visible.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, '../App.css'), 'utf8')
const solo = readFileSync(join(here, '../components/SoloView.tsx'), 'utf8')
const langBtn = readFileSync(join(here, '../components/LangLabelButton.tsx'), 'utf8')

const paneBlock = css.match(/\.solo-upper,\s*\n\.solo-lower\s*\{[^}]+\}/)?.[0] || ''
assert.match(paneBlock, /overflow:\s*visible/, 'Solo panes must not clip lang pill / mic glow')
assert.doesNotMatch(paneBlock, /overflow-y:\s*auto/, 'Pane scroll must not live on the chrome')

assert.match(css, /\.solo-pane-scroll\s*\{[^}]*overflow-y:\s*auto/s, 'Body scroll lives on .solo-pane-scroll')
assert.match(css, /\.solo-pane-head\s*\{[^}]*flex-shrink:\s*0/s, 'Pane head must not shrink under flex')
assert.match(css, /\.solo-stage\s*\{[^}]*overflow:\s*visible/s, 'Stage must allow mic highlight bleed')

assert.match(solo, /className="solo-pane-scroll"/, 'SoloView wraps pane body in scroll region')
assert.equal(
  (solo.match(/className="solo-pane-scroll"/g) || []).length,
  2,
  'Both upper and lower panes get a scroll region',
)

assert.match(
  langBtn,
  /variant === 'dropdown'[\s\S]*layout="inline"/,
  'Dropdown lang pill uses inline BiText so primary gloss fits chrome',
)

console.log('soloPaneClip.smoke: ok')
