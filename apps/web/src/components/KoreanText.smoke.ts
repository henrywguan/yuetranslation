/**
 * Compact RR visibility for KoreanText.
 * Run with app jsx runtime: `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/KoreanText.smoke.ts`
 */
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { KoreanText } from './KoreanText.tsx'
import { KOREAN_HONESTY_NOTE } from '../lib/koreanSpeechLevel.ts'

const compact = renderToStaticMarkup(React.createElement(KoreanText, { text: '안녕하세요' }))
assert.match(compact, /안녕하세요/)
assert.match(compact, /annyeonghaseyo/)
assert.match(compact, /Revised Romanization/)
assert.doesNotMatch(compact, /korean-level-chip/)
assert.doesNotMatch(compact, new RegExp(KOREAN_HONESTY_NOTE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

const detail = renderToStaticMarkup(
  React.createElement(KoreanText, { text: '안녕하세요', showDetail: true }),
)
assert.match(detail, /annyeonghaseyo/)
assert.match(detail, /korean-level-chip/)
assert.match(detail, /해요/)
assert.match(detail, /batchim/)

const empty = renderToStaticMarkup(
  React.createElement(KoreanText, { text: '  ', placeholder: React.createElement('span', null, 'empty') }),
)
assert.match(empty, /empty/)

console.log('KoreanText.smoke ok')
