import assert from 'node:assert/strict'
import { buildLocalLatinBreakdown, isLatinDetailLang } from './localLatinBreakdown'

assert.equal(isLatinDetailLang('en'), true)
assert.equal(isLatinDetailLang('nl'), true)
assert.equal(isLatinDetailLang('ptpt'), true)
assert.equal(isLatinDetailLang('tr'), true)
assert.equal(isLatinDetailLang('ta'), false)
assert.equal(isLatinDetailLang('bn'), false)
assert.equal(isLatinDetailLang('fr'), true)
assert.equal(isLatinDetailLang('id'), true)
assert.equal(isLatinDetailLang('pt'), true)
assert.equal(isLatinDetailLang('de'), true)
assert.equal(isLatinDetailLang('it'), true)
assert.equal(isLatinDetailLang('ms'), true)
assert.equal(isLatinDetailLang('jv'), true)
assert.equal(isLatinDetailLang('hi'), false)
assert.equal(isLatinDetailLang('bcl'), true)
assert.equal(isLatinDetailLang('ceb'), true)
assert.equal(isLatinDetailLang('ilo'), true)
for (const l of ['da', 'nb', 'fi', 'sk', 'hr', 'ca'] as const) assert.equal(isLatinDetailLang(l), true, l)
for (const l of ['ml', 'mr', 'pa', 'or', 'si', 'ne'] as const) assert.equal(isLatinDetailLang(l), false, l)
assert.equal(isLatinDetailLang('yue'), false)
for (const l of ['pl', 'ro', 'cs', 'hu', 'sv', 'da', 'nb', 'fi', 'sk', 'hr', 'ca'] as const) {
  assert.equal(isLatinDetailLang(l), true, l)
}
for (const l of ['te', 'gu', 'kn', 'el', 'ru', 'uk', 'he', 'fa', 'ur', 'ml', 'mr', 'pa', 'or', 'si', 'ne'] as const) {
  assert.equal(isLatinDetailLang(l), false, l)
}

const ro = buildLocalLatinBreakdown('Mulțumesc, științific!', { lang: 'ro' })
assert.ok(ro.some((r) => r.char === 'Mulțumesc'), 'comma-below ț stays inside the word')
assert.ok(ro.some((r) => r.char === 'științific'))

const hallo = buildLocalLatinBreakdown('Hallo!', { phraseGloss: 'Hello', lang: 'nl' })
assert.ok(hallo.some((r) => r.char === 'Hallo'))
assert.equal(hallo.find((r) => r.char === '!')?.meaning, 'exclamation mark')

const da = buildLocalLatinBreakdown('Hvordan går det, åh?', { lang: 'da' })
assert.ok(da.some((r) => r.char === 'går'), 'å stays inside the word')
const fi = buildLocalLatinBreakdown('Kiitos paljon!', { lang: 'fi' })
assert.ok(fi.some((r) => r.char === 'Kiitos'))
assert.equal(fi.find((r) => r.char === '!')?.meaning, 'exclamation mark')
const hr = buildLocalLatinBreakdown('Hvala lijepa, čuješ?', { lang: 'hr' })
assert.ok(hr.some((r) => r.char === 'čuješ'), 'č š stay inside the word')
const ca = buildLocalLatinBreakdown("Bon dia, l'amic!", { lang: 'ca' })
assert.ok(ca.some((r) => r.char === 'Bon') && ca.some((r) => r.char === 'dia'))

const apple = buildLocalLatinBreakdown('Apple', { phraseGloss: '蘋果', lang: 'en' })
assert.equal(apple.length, 1)
assert.equal(apple[0]?.char, 'Apple')
assert.equal(apple[0]?.meaning, '蘋果')

const phrase = buildLocalLatinBreakdown('Hello, world!', { phraseGloss: '你好世界' })
assert.ok(phrase.length >= 3)
assert.equal(phrase.find((r) => r.char === 'Hello')?.meaning, '')
assert.equal(phrase.find((r) => r.char === ',')?.meaning, 'comma')

console.log('localLatinBreakdown.smoke: ok')
