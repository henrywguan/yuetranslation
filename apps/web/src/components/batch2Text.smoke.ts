/**
 * Batch 2 LangFamilyText: compact stays native script / orthography only; Details add readings, chips, honesty.
 * Run: `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch2Text.smoke.ts`
 */
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LangFamilyText } from './LangFamilyText.tsx'
import type { LangFamilyLang } from '../lib/langFamily'

const render = (lang: LangFamilyLang, text: string, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(React.createElement(LangFamilyText, { lang, text, ...extra }))

const CASES: Array<{
  lang: LangFamilyLang
  htmlLang: string
  text: string
  /** Only shown in Details (reading / chip / honesty). */
  detail: RegExp[]
  rtl?: boolean
}> = [
  { lang: 'te', htmlLang: 'te-IN', text: 'మీరు ఎలా ఉన్నారు?', detail: [/ISO 15919/, /mīru/, /address-chip--meeru/, /not tonal/] },
  { lang: 'gu', htmlLang: 'gu-IN', text: 'તમે કેમ છો?', detail: [/ISO 15919/, /tame/, /address-chip--tame/, /not Devanagari/] },
  { lang: 'kn', htmlLang: 'kn-IN', text: 'ನೀವು ಹೇಗಿದ್ದೀರಿ?', detail: [/ISO 15919/, /nīvu/, /address-chip--neevu/] },
  { lang: 'pl', htmlLang: 'pl-PL', text: 'Czy Pan może mi pomóc?', detail: [/address-chip--pan/, /second-to-last syllable/] },
  { lang: 'ro', htmlLang: 'ro-RO', text: 'Ce faci tu?', detail: [/address-chip--tu/, /comma below/] },
  { lang: 'cs', htmlLang: 'cs-CZ', text: 'Kde jsi?', detail: [/address-chip--ty/, /first syllable/] },
  { lang: 'el', htmlLang: 'el-GR', text: 'Πώς είστε; Εσείς;', detail: [/address-chip--eseis/, /τόνος/] },
  { lang: 'hu', htmlLang: 'hu-HU', text: 'Ön beszél angolul?', detail: [/address-chip--on/, /vowel harmony/] },
  { lang: 'sv', htmlLang: 'sv-SE', text: 'Hur mår du?', detail: [/address-chip--du/, /pitch accent/] },
  { lang: 'ru', htmlLang: 'ru-RU', text: 'Как Вы поживаете?', detail: [/BGN\/PCGN/, /Kak/, /address-chip--vy/] },
  { lang: 'uk', htmlLang: 'uk-UA', text: 'Як ти?', detail: [/Ukrainian national/, /Yak ty/, /address-chip--ty/, /not Russian/] },
  { lang: 'he', htmlLang: 'he-IL', text: 'שלום, מה שלומך?', detail: [/niqqud/], rtl: true },
  { lang: 'fa', htmlLang: 'fa-IR', text: 'حال شما چطور است؟', detail: [/address-chip--shoma/, /not Arabic/], rtl: true },
  { lang: 'ur', htmlLang: 'ur-IN', text: 'آپ کیسے ہیں؟', detail: [/address-chip--aap/, /never shown in Devanagari/], rtl: true },
]

for (const c of CASES) {
  const compact = render(c.lang, c.text)
  assert.ok(compact.includes(c.text), `${c.lang}: compact keeps native text`)
  assert.match(compact, new RegExp(`lang="${c.htmlLang}"`), `${c.lang}: html lang`)
  assert.doesNotMatch(compact, /lang-family-reading|lang-family-address|lang-family-honesty/, `${c.lang}: compact is script-only`)
  assert.equal(/dir="rtl"/.test(compact), Boolean(c.rtl), `${c.lang}: rtl chrome`)
  assert.match(compact, new RegExp(`lang-family-block--${c.lang}`))

  const detail = render(c.lang, c.text, { showDetail: true })
  for (const re of c.detail) assert.match(detail, re, `${c.lang}: detail ${re}`)
  if (c.rtl) assert.doesNotMatch(detail, /lang-family-reading-row/, `${c.lang}: no transliteration line`)

  const empty = renderToStaticMarkup(
    React.createElement(LangFamilyText, {
      lang: c.lang,
      text: '  ',
      placeholder: React.createElement('span', null, 'empty'),
    }),
  )
  assert.match(empty, /empty/)

  const btn = render(c.lang, c.text, { onActivate: () => {} })
  assert.match(btn, /lang-family-activate/)
}

console.log('batch2Text.smoke ok', { langs: CASES.length })
