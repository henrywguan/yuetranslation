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

const upperBlock = css.match(/\.solo-upper\s*\{[^}]+\}/)?.[0] || ''
assert.match(upperBlock, /flex:\s*0\s+0\s+auto/, 'Upper pane must not flex-shrink under a tall lower pane')
assert.match(
  css,
  /\.solo-upper\s+\.solo-pane-scroll\s*\{[^}]*min-height:\s*2\.75rem/s,
  'Upper scroll region keeps at least one result line visible',
)

assert.match(solo, /className="solo-pane-scroll"/, 'SoloView wraps pane body in scroll region')
assert.equal(
  (solo.match(/className="solo-pane-scroll"/g) || []).length,
  2,
  'Both upper and lower panes get a scroll region',
)

assert.doesNotMatch(
  solo,
  /solo-pane-actions-stack[\s\S]{0,200}renderPaneSecondary/,
  'Secondary icons must not live in the head stack (collapses lower scroll + clips)',
)
assert.match(
  solo,
  /showLowerResult \? renderPaneSecondary\('lower'\)/,
  'Lower Share/star/say-it-back render in the scroll body under the translation',
)
assert.match(
  solo,
  /solo-pane-actions-leading[\s\S]*solo-ask-chat-btn/,
  'Ask in Chat sits beside Details, not under Speak',
)
assert.match(solo, /collapsible/, 'Solo Other variations start collapsed (tap to expand)')

assert.match(
  css,
  /\.solo-pane-actions\s*\{[^}]*flex-wrap:\s*nowrap/s,
  'Pane head actions must not wrap icons past the mic-glow border',
)
assert.match(
  css,
  /\.solo-lower\s+\.solo-pane-scroll\s*\{[^}]*min-height:\s*3\.5rem/s,
  'Lower scroll keeps translation visible even when head chrome is tall',
)
assert.match(css, /\.solo-pane-secondary\s*\{/, 'Secondary action row styles exist')

assert.match(
  langBtn,
  /variant === 'dropdown'[\s\S]*layout="inline"/,
  'Dropdown lang pill uses inline BiText so primary gloss fits chrome',
)

console.log('soloPaneClip.smoke: ok')
