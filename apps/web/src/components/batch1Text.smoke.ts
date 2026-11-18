/**
 * Compact stays script / orthography only; Details add readings, chips, honesty.
 * Run: `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch1Text.smoke.ts`
 */
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TaText } from './TaText.tsx'
import { BnText } from './BnText.tsx'
import { TrText } from './TrText.tsx'
import { PtptText } from './PtptText.tsx'

const render = (el: React.ReactElement) => renderToStaticMarkup(el)

const taCompact = render(React.createElement(TaText, { text: 'வணக்கம்' }))
assert.match(taCompact, /வணக்கம்/)
assert.match(taCompact, /lang="ta-IN"/)
assert.doesNotMatch(taCompact, /vaṇakkam|ISO 15919/)
const taDetail = render(React.createElement(TaText, { text: 'நீங்கள் எப்படி இருக்கீங்க?', showDetail: true }))
assert.match(taDetail, /ISO 15919/)
assert.match(taDetail, /tamil-address-chip--neengal/)
assert.match(taDetail, /not tonal/)

const bnCompact = render(React.createElement(BnText, { text: 'নমস্কার' }))
assert.match(bnCompact, /lang="bn-IN"/)
assert.doesNotMatch(bnCompact, /namaskāra|ISO 15919/)
const bnDetail = render(React.createElement(BnText, { text: 'আপনি কেমন আছেন?', showDetail: true }))
assert.match(bnDetail, /āpani/)
assert.match(bnDetail, /bengali-address-chip--apni/)

const trCompact = render(React.createElement(TrText, { text: 'Nasılsınız?' }))
assert.match(trCompact, /lang="tr-TR"/)
assert.doesNotMatch(trCompact, /turkish-address-chip|vowel harmony/)
const trDetail = render(React.createElement(TrText, { text: 'Nasılsınız?', showDetail: true }))
assert.match(trDetail, /turkish-address-chip--siz/)
assert.match(trDetail, /vowel harmony/)

const ptCompact = render(React.createElement(PtptText, { text: 'Apanho o autocarro.' }))
assert.match(ptCompact, /lang="pt-PT"/)
assert.doesNotMatch(ptCompact, /pt-BR|european-portuguese-stress-chip/)
const ptDetail = render(React.createElement(PtptText, { text: 'Apanho o autocarro.', showDetail: true }))
assert.match(ptDetail, /european-portuguese-stress-chip--paroxitona/)
assert.match(ptDetail, /unstressed vowels/)

for (const C of [TaText, BnText, TrText, PtptText]) {
  const empty = render(
    React.createElement(C, { text: '  ', placeholder: React.createElement('span', null, 'empty') }),
  )
  assert.match(empty, /empty/)
}

const btn = render(React.createElement(TrText, { text: 'Merhaba', onActivate: () => {} }))
assert.match(btn, /turkish-activate/)

console.log('batch1Text.smoke ok')
