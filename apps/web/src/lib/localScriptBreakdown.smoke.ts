import assert from 'node:assert/strict'
import { buildLocalScriptBreakdown, isScriptDetailLang } from './localScriptBreakdown'

assert.equal(isScriptDetailLang('ta'), true)
assert.equal(isScriptDetailLang('bn'), true)
assert.equal(isScriptDetailLang('el'), true)
assert.equal(isScriptDetailLang('ru'), true)
assert.equal(isScriptDetailLang('he'), true)
assert.equal(isScriptDetailLang('ml'), true)
assert.equal(isScriptDetailLang('si'), true)
assert.equal(isScriptDetailLang('ne'), true)
assert.equal(isScriptDetailLang('ptpt'), false)
assert.equal(isScriptDetailLang('tr'), false)
assert.equal(isScriptDetailLang('pl'), false)
assert.equal(isScriptDetailLang('da'), false)
assert.equal(isScriptDetailLang('hi'), false)

const ta = buildLocalScriptBreakdown('வணக்கம்!', 'ta', { phraseGloss: 'Hello' })
assert.equal(ta.length, 2)
assert.equal(ta[0]?.char, 'வணக்கம்')
assert.equal(ta[0]?.meaning, 'Hello')
assert.equal(ta[1]?.meaning, 'exclamation mark')

const bn = buildLocalScriptBreakdown('নমস্কার।', 'bn')
assert.ok(bn.some((r) => r.char === 'নমস্কার'))
assert.equal(bn.find((r) => r.char === '।')?.meaning, 'full stop')

const te = buildLocalScriptBreakdown('నమస్కారం', 'te', { phraseGloss: 'Hello' })
assert.equal(te[0]?.char, 'నమస్కారం')
assert.equal(te[0]?.meaning, 'Hello')

const el = buildLocalScriptBreakdown('Γεια!', 'el', { phraseGloss: 'Hi' })
assert.equal(el[0]?.char, 'Γεια')
assert.equal(el[1]?.meaning, 'exclamation mark')

const ru = buildLocalScriptBreakdown('Привет', 'ru', { phraseGloss: 'Hi' })
assert.equal(ru[0]?.meaning, 'Hi')

const he = buildLocalScriptBreakdown('שלום', 'he', { phraseGloss: 'Peace' })
assert.equal(he[0]?.meaning, 'Peace')

const ml = buildLocalScriptBreakdown('നമസ്കാരം!', 'ml', { phraseGloss: 'Hello' })
assert.equal(ml[0]?.char, 'നമസ്കാരം')
assert.equal(ml[0]?.meaning, 'Hello')
assert.equal(ml[1]?.meaning, 'exclamation mark')

const mr = buildLocalScriptBreakdown('नमस्कार।', 'mr', { phraseGloss: 'Hello' })
assert.equal(mr[0]?.char, 'नमस्कार')
assert.equal(mr.find((r) => r.char === '।')?.meaning, 'full stop')

const pa = buildLocalScriptBreakdown('ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'pa')
assert.equal(pa.length, 3)

const or = buildLocalScriptBreakdown('ନମସ୍କାର', 'or', { phraseGloss: 'Hello' })
assert.equal(or[0]?.meaning, 'Hello')

const si = buildLocalScriptBreakdown('ආයුබෝවන්!', 'si', { phraseGloss: 'Hello' })
assert.equal(si[0]?.char, 'ආයුබෝවන්')
assert.equal(si[0]?.meaning, 'Hello')

const ne = buildLocalScriptBreakdown('नमस्ते', 'ne', { phraseGloss: 'Hello' })
assert.equal(ne[0]?.meaning, 'Hello')

for (const l of ['ml', 'mr', 'pa', 'or', 'si', 'ne'] as const) assert.equal(isScriptDetailLang(l), true, l)
for (const l of ['da', 'nb', 'fi', 'sk', 'hr', 'ca'] as const) assert.equal(isScriptDetailLang(l), false, l)

for (const l of ['kk', 'bg', 'sr'] as const) assert.equal(isScriptDetailLang(l), true, l)
for (const l of ['az', 'uz', 'sw', 'af'] as const) assert.equal(isScriptDetailLang(l), false, l)
const kk = buildLocalScriptBreakdown('Сәлем, қалайсың?', 'kk', { phraseGloss: 'Hello' })
assert.equal(kk[0]?.char, 'Сәлем')
assert.ok(kk.some((r) => r.char === 'қалайсың'), 'Kazakh letters stay inside the word')
const bg = buildLocalScriptBreakdown('Здравей!', 'bg', { phraseGloss: 'Hello' })
assert.equal(bg[0]?.char, 'Здравей')
assert.equal(bg[0]?.meaning, 'Hello')
const sr = buildLocalScriptBreakdown('Здраво, пријатељу!', 'sr')
assert.ok(sr.some((r) => r.char === 'пријатељу'), 'ј љ stay inside the word')
assert.equal(sr.find((r) => r.char === '!')?.meaning, 'exclamation mark')

for (const l of ['as', 'mk', 'mn', 'hy', 'ka', 'am', 'ps'] as const) assert.equal(isScriptDetailLang(l), true, l)
for (const l of ['et', 'lv', 'is', 'bs', 'sq', 'zu', 'so', 'mt'] as const) {
  assert.equal(isScriptDetailLang(l), false, `${l}: Latin langs use Latin breakdown`)
}
const as = buildLocalScriptBreakdown('নমস্কাৰ!', 'as', { phraseGloss: 'Hello' })
assert.equal(as[0]?.char, 'নমস্কাৰ')
assert.equal(as[0]?.meaning, 'Hello')
const mk = buildLocalScriptBreakdown('Здраво, ѓаволе!', 'mk')
assert.ok(mk.some((r) => r.char === 'ѓаволе'), 'ѓ stays inside the word')
const mn = buildLocalScriptBreakdown('Сайн байна уу, өвөө!', 'mn', { phraseGloss: 'Hello' })
assert.equal(mn[0]?.char, 'Сайн')
assert.ok(mn.some((r) => r.char === 'өвөө'), 'ө stays inside the word')
const hy = buildLocalScriptBreakdown('Բարեւ։', 'hy', { phraseGloss: 'Hello' })
assert.equal(hy[0]?.char, 'Բարեւ')
assert.equal(hy[0]?.meaning, 'Hello')
assert.equal(hy.find((r) => r.char === '։')?.meaning, 'full stop')
const ka = buildLocalScriptBreakdown('გამარჯობა!', 'ka', { phraseGloss: 'Hello' })
assert.equal(ka[0]?.char, 'გამარჯობა')
assert.equal(ka.find((r) => r.char === '!')?.meaning, 'exclamation mark')
const am = buildLocalScriptBreakdown('ሰላም።', 'am', { phraseGloss: 'Hello' })
assert.equal(am[0]?.char, 'ሰላም')
assert.equal(am.find((r) => r.char === '።')?.meaning, 'full stop')
const ps = buildLocalScriptBreakdown('سلام، څنګه یاست؟', 'ps')
assert.ok(ps.some((r) => r.char === 'څنګه'), 'Pashto letters stay inside the word')
assert.equal(ps.find((r) => r.char === '،')?.meaning, 'comma')
assert.equal(ps.find((r) => r.char === '؟')?.meaning, 'question mark')

const multi = buildLocalScriptBreakdown('நீங்கள் எப்படி?', 'ta', { phraseGloss: 'How are you?' })
assert.ok(multi.length >= 2)
assert.equal(multi.find((r) => r.char === 'நீங்கள்')?.meaning, '', 'multi-token keeps empty gloss offline')

console.log('localScriptBreakdown.smoke: ok')
