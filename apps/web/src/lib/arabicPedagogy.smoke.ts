import assert from 'node:assert/strict'
import {
  ARABIC_DIACRITIC_NOTE,
  EGYPTIAN_ARABIC_HONESTY_NOTE,
  MSA_HONESTY_NOTE,
  arabicHonestyNote,
  arabicHtmlLang,
  hasTashkeel,
} from './arabicPedagogy.ts'

assert.equal(arabicHonestyNote('ar'), EGYPTIAN_ARABIC_HONESTY_NOTE)
assert.equal(arabicHonestyNote('arsa'), MSA_HONESTY_NOTE)
assert.notEqual(EGYPTIAN_ARABIC_HONESTY_NOTE, MSA_HONESTY_NOTE)
assert.ok(EGYPTIAN_ARABIC_HONESTY_NOTE.includes('Egyptian'))
assert.ok(MSA_HONESTY_NOTE.includes('Modern Standard'))
assert.equal(arabicHtmlLang('ar'), 'ar-EG')
assert.equal(arabicHtmlLang('arsa'), 'ar-SA')
assert.equal(hasTashkeel('إزيك عامل إيه؟'), false)
assert.equal(hasTashkeel('مَرْحَبًا'), true)
assert.equal(hasTashkeel('كـتـاب'), false)
assert.ok(ARABIC_DIACRITIC_NOTE.includes('tashkeel'))

console.log('arabicPedagogy.smoke: ok')
