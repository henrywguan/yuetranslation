/**
 * Compact vs Details visibility for JaText.
 * Run: `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/JaText.smoke.ts`
 */
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { JaText } from './JaText.tsx'
import { JAPANESE_HONESTY_NOTE } from '../lib/japanesePoliteness.ts'

const compact = renderToStaticMarkup(React.createElement(JaText, { text: 'こんにちは' }))
assert.match(compact, /こんにちは/)
assert.doesNotMatch(compact, /konnichiwa/)
assert.doesNotMatch(compact, /japanese-level-chip/)
assert.doesNotMatch(compact, new RegExp(JAPANESE_HONESTY_NOTE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

const detail = renderToStaticMarkup(
  React.createElement(JaText, { text: 'こんにちは', showDetail: true }),
)
assert.match(detail, /こんにちは/)
assert.match(detail, /konnichiwa/)
assert.match(detail, /japanese-honesty/)
assert.match(detail, /です・ます|pitch accent/i)

const detailPlain = renderToStaticMarkup(
  React.createElement(JaText, { text: '行く', showDetail: true }),
)
assert.match(detailPlain, /普通形/)

const empty = renderToStaticMarkup(
  React.createElement(JaText, { text: '  ', placeholder: React.createElement('span', null, 'empty') }),
)
assert.match(empty, /empty/)

console.log('JaText.smoke ok')
