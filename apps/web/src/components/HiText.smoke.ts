/**
 * Compact stays Devanagari-only; Details may show IAST + formality.
 * Run: `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/HiText.smoke.ts`
 */
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HiText } from './HiText.tsx'
import { HINDI_HONESTY_NOTE } from '../lib/hindiFormality.ts'

const compact = renderToStaticMarkup(React.createElement(HiText, { text: 'नमस्ते' }))
assert.match(compact, /नमस्ते/)
assert.doesNotMatch(compact, /namaste/)
assert.doesNotMatch(compact, /IAST/)
assert.doesNotMatch(compact, /hindi-level-chip/)
assert.doesNotMatch(compact, new RegExp(HINDI_HONESTY_NOTE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

const detail = renderToStaticMarkup(
  React.createElement(HiText, { text: 'आप कैसे हैं?', showDetail: true }),
)
assert.match(detail, /आप कैसे हैं\?/)
assert.match(detail, /IAST/)
assert.match(detail, /hindi-level-chip/)
assert.match(detail, /आप/)
assert.match(detail, /schwa/)

const empty = renderToStaticMarkup(
  React.createElement(HiText, { text: '  ', placeholder: React.createElement('span', null, 'empty') }),
)
assert.match(empty, /empty/)

console.log('HiText.smoke ok')
