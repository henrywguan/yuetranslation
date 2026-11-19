/**
 * Batch 3b LangFamilyText: compact stays native script / orthography only; Details add readings, chips, honesty.
 * Run: `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3bText.smoke.ts`
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
  /** Serbian never grows a Latin reading line. */
  noReading?: boolean
}> = [
  { lang: 'az', htmlLang: 'az-AZ', text: 'Siz necəsiniz?', detail: [/address-chip--siz/, /not Turkish/] },
  { lang: 'kk', htmlLang: 'kk-KZ', text: 'Сіз қалайсыз?', detail: [/BGN\/PCGN/, /Siz qalaysyz/, /address-chip--siz/, /not Russian/] },
  { lang: 'uz', htmlLang: 'uz-UZ', text: 'Siz qalaysiz?', detail: [/address-chip--siz/, /not Cyrillic/] },
  { lang: 'bg', htmlLang: 'bg-BG', text: 'Как сте вие?', detail: [/Streamlined System/, /address-chip--vie/, /not Russian/] },
  {
    lang: 'sr',
    htmlLang: 'sr-Cyrl-RS',
    text: 'Како сте Ви?',
    detail: [/address-chip--vi/, /Cyrillic only/],
    noReading: true,
  },
  { lang: 'sw', htmlLang: 'sw-KE', text: 'Habari yenu nyinyi?', detail: [/address-chip--nyinyi/, /Bantu/] },
  { lang: 'af', htmlLang: 'af-ZA', text: 'Hoe gaan dit met jou?', detail: [/address-chip--jy/, /Dutch/] },
]

for (const c of CASES) {
  const compact = render(c.lang, c.text)
  assert.ok(compact.includes(c.text), `${c.lang}: compact keeps native text`)
  assert.match(compact, new RegExp(`lang="${c.htmlLang}"`), `${c.lang}: html lang`)
  assert.doesNotMatch(compact, /lang-family-reading|lang-family-address|lang-family-honesty/, `${c.lang}: compact is script-only`)
  assert.doesNotMatch(compact, /dir="rtl"/, `${c.lang}: LTR chrome`)
  assert.match(compact, new RegExp(`lang-family-block--${c.lang}`))

  const detail = render(c.lang, c.text, { showDetail: true })
  for (const re of c.detail) assert.match(detail, re, `${c.lang}: detail ${re}`)
  if (c.noReading) assert.doesNotMatch(detail, /lang-family-reading/, `${c.lang}: no Latin reading`)

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

console.log('batch3bText.smoke ok', { langs: CASES.length })
