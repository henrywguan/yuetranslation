/**
 * Batch 3a LangFamilyText: compact stays native script / orthography only; Details add readings, chips, honesty.
 * Run: `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch3aText.smoke.ts`
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
}> = [
  { lang: 'ml', htmlLang: 'ml-IN', text: 'നിങ്ങൾ എവിടെയാണ്?', detail: [/ISO 15919/, /address-chip--ningal/, /not tonal/] },
  { lang: 'mr', htmlLang: 'mr-IN', text: 'तुम्ही कसे आहात?', detail: [/ISO 15919/, /tumhī/, /address-chip--tumhi/, /not Hindi/] },
  { lang: 'pa', htmlLang: 'pa-IN', text: 'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?', detail: [/ISO 15919/, /address-chip--tusi/, /Punjabi is tonal/] },
  { lang: 'or', htmlLang: 'or-IN', text: 'ଆପଣ କେମିତି ଅଛନ୍ତି?', detail: [/ISO 15919/, /address-chip--apana/, /not tonal/] },
  { lang: 'si', htmlLang: 'si-LK', text: 'ඔබට කොහොමද?', detail: [/ISO 15919/, /address-chip--oba/, /diglossic/] },
  { lang: 'ne', htmlLang: 'ne-NP', text: 'तपाईंलाई कस्तो छ?', detail: [/ISO 15919/, /address-chip--tapai/, /not Hindi/] },
  { lang: 'da', htmlLang: 'da-DK', text: 'Hvordan har du det?', detail: [/address-chip--du/, /stød/] },
  { lang: 'nb', htmlLang: 'nb-NO', text: 'Hvordan har dere det?', detail: [/address-chip--dere/, /Bokmål/] },
  { lang: 'fi', htmlLang: 'fi-FI', text: 'Mitä sinulle kuuluu?', detail: [/address-chip--sina/, /vowel harmony/] },
  { lang: 'sk', htmlLang: 'sk-SK', text: 'Ako sa máte? Ste v poriadku?', detail: [/address-chip--vy/, /not Czech/] },
  { lang: 'hr', htmlLang: 'hr-HR', text: 'Kako ste Vi?', detail: [/address-chip--vi/, /pitch accent/] },
  { lang: 'ca', htmlLang: 'ca-ES', text: 'Com està vostè?', detail: [/address-chip--voste/, /not Spanish/] },
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

console.log('batch3aText.smoke ok', { langs: CASES.length })
