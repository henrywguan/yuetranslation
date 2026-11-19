/**
 * Batch 4 LangFamilyText: compact stays native script / orthography only; Details add readings, chips, honesty.
 * Run: `npx tsx --tsconfig apps/web/tsconfig.app.json apps/web/src/components/batch4Text.smoke.ts`
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
  /** Script langs without a Latin reading never grow one. */
  noReading?: boolean
}> = [
  { lang: 'et', htmlLang: 'et-EE', text: 'Kuidas teil läheb, teie?', detail: [/address-chip--teie/, /Finnic/] },
  { lang: 'lv', htmlLang: 'lv-LV', text: 'Kā jums iet, jūs?', detail: [/address-chip--jus/, /Baltic/] },
  { lang: 'lt', htmlLang: 'lt-LT', text: 'Kaip jums sekasi, jūs?', detail: [/address-chip--jus/, /Baltic/] },
  { lang: 'ga', htmlLang: 'ga-IE', text: 'Conas atá sibh?', detail: [/address-chip--sibh/, /initial mutations/] },
  { lang: 'cy', htmlLang: 'cy-GB', text: 'Sut ydych chi?', detail: [/address-chip--chi/, /Welsh has initial/] },
  { lang: 'eu', htmlLang: 'eu-ES', text: 'Zer moduz zuek?', detail: [/address-chip--zuek/, /isolate/] },
  { lang: 'gl', htmlLang: 'gl-ES', text: 'Como está vostede?', detail: [/address-chip--vostede/, /Galician/] },
  { lang: 'mt', htmlLang: 'mt-MT', text: 'Kif intom intom?', detail: [/address-chip--intom/, /Maltese/] },
  { lang: 'is', htmlLang: 'is-IS', text: 'Hvernig hafið þið það?', detail: [/address-chip--thid/, /Icelandic/] },
  { lang: 'bs', htmlLang: 'bs-BA', text: 'Kako ste vi?', detail: [/address-chip--vi/, /Latin/] },
  { lang: 'sq', htmlLang: 'sq-AL', text: 'Si jeni ju?', detail: [/address-chip--ju/, /Albanian/] },
  { lang: 'zu', htmlLang: 'zu-ZA', text: 'Unjani nina?', detail: [/address-chip--nina/, /Bantu|Zulu/] },
  { lang: 'so', htmlLang: 'so-SO', text: 'Sidee tahay adiga?', detail: [/address-chip--adiga/, /Somali/] },
  { lang: 'as', htmlLang: 'as-IN', text: 'আপুনি কেনে আছে?', detail: [/ISO 15919/, /address-chip--apuni/] },
  { lang: 'mk', htmlLang: 'mk-MK', text: 'Како сте Вие?', detail: [/BGN\/PCGN/, /Kako ste/, /address-chip--vie/, /not Bulgarian/] },
  { lang: 'mn', htmlLang: 'mn-MN', text: 'Та сайн байна уу?', detail: [/MNS 5217/, /Ta sain baina uu/, /address-chip--ta/, /not traditional/] },
  { lang: 'ps', htmlLang: 'ps-AF', text: 'تاسو څنګه یاست؟', detail: [/address-chip--taso/, /Persian|Dari/], rtl: true, noReading: true },
  { lang: 'hy', htmlLang: 'hy-AM', text: 'դուք ինչպես եք?', detail: [/address-chip--duk/, /Armenian/], noReading: true },
  { lang: 'ka', htmlLang: 'ka-GE', text: 'თქვენ როგორ ბრძანდებით?', detail: [/address-chip--tkven/, /Georgian/], noReading: true },
  { lang: 'am', htmlLang: 'am-ET', text: 'እርስዎ እንዴት ነዎት?', detail: [/address-chip--ersiwo/, /Ethiopic/], noReading: true },
]

for (const c of CASES) {
  const compact = render(c.lang, c.text)
  assert.ok(compact.includes(c.text), `${c.lang}: compact keeps native text`)
  assert.match(compact, new RegExp(`lang="${c.htmlLang}"`), `${c.lang}: html lang`)
  assert.doesNotMatch(compact, /lang-family-reading|lang-family-address|lang-family-honesty/, `${c.lang}: compact is script-only`)
  if (c.rtl) assert.match(compact, /dir="rtl"/, `${c.lang}: RTL chrome`)
  else assert.doesNotMatch(compact, /dir="rtl"/, `${c.lang}: LTR chrome`)
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

console.log('batch4Text.smoke ok', { langs: CASES.length })
