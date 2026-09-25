import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const soloSrc = readFileSync(join(root, 'SoloView.tsx'), 'utf8')
const cssSrc = readFileSync(join(root, '../App.css'), 'utf8')
const resultSrc = readFileSync(join(root, 'ResultWithDefinition.tsx'), 'utf8')

assert.doesNotMatch(
  soloSrc,
  /rows=\{3\}/,
  'Solo English/type panes must not clip results to 3 textarea rows',
)
assert.match(soloSrc, /fitSoloTextarea/, 'Solo type panes auto-grow to the draft')
assert.match(soloSrc, /showLowerResult/, 'Finished Solo drafts render as full results')
assert.match(soloSrc, /cantonese=\{lang !== 'en'\}/, 'English Solo results use the flowing result block')

assert.match(cssSrc, /\.solo-input \{[\s\S]*?field-sizing: content/, 'Solo inputs size to content')
assert.match(cssSrc, /\.solo-input \{[\s\S]*?overflow: hidden/, 'Solo inputs grow instead of scrolling internally')
assert.match(cssSrc, /\.solo-translation \{[\s\S]*?width: 100%/, 'Solo results use the full pane width')
assert.match(
  cssSrc,
  /\.pane-hero \{[\s\S]*?max-width: 100%/,
  'Conversation heroes use the full pane width',
)
assert.doesNotMatch(
  cssSrc,
  /\.pane-hero \{[\s\S]*?max-width: 22rem/,
  'Conversation heroes must not clip to 22rem',
)

assert.match(
  resultSrc,
  /lang="en"/,
  'English ResultWithDefinition stays a full flowing line (tappable when details exist)',
)

console.log('soloResultLayout.smoke: ok')
