import assert from 'node:assert/strict'
import { romanizeBengaliIso15919 } from './bengaliIso15919.ts'
import {
  BENGALI_HONESTY_NOTE,
  bengaliAddressChip,
  bengaliAddressLabel,
  detectBengaliAddress,
} from './bengaliPedagogy.ts'

assert.equal(romanizeBengaliIso15919('বাংলা'), 'bāṁlā')
assert.equal(romanizeBengaliIso15919('নমস্কার'), 'namaskāra')
assert.equal(romanizeBengaliIso15919('ধন্যবাদ'), 'dhanyabāda')
assert.equal(romanizeBengaliIso15919('আমি ভালো আছি।'), 'āmi bhālo āchi.')
assert.equal(romanizeBengaliIso15919('কোথায়'), 'kothāẏa')
assert.equal(romanizeBengaliIso15919('কো'), 'ko', 'decomposed ো (ে + া) normalizes to o')
assert.equal(romanizeBengaliIso15919('চাঁদ'), 'cām̐da')
assert.equal(romanizeBengaliIso15919('বড়'), 'baṛa')
assert.equal(romanizeBengaliIso15919('হঠাৎ'), 'haṭhāt')
assert.equal(romanizeBengaliIso15919('কৃষি'), 'kr̥ṣi')
assert.equal(romanizeBengaliIso15919('১২'), '12')
assert.equal(romanizeBengaliIso15919('nomoshkar'), null)
assert.equal(romanizeBengaliIso15919('नमस्ते'), null, 'Devanagari never gets a Bengali reading')

assert.equal(detectBengaliAddress('আপনি কেমন আছেন?'), 'apni')
assert.equal(detectBengaliAddress('তুমি কোথায় যাচ্ছ?'), 'tumi')
assert.equal(detectBengaliAddress('তোর নাম কী?'), 'tui')
assert.equal(detectBengaliAddress('নমস্কার'), null)
assert.equal(bengaliAddressChip('apni'), 'আপনি')
assert.equal(bengaliAddressLabel('tui'), 'তুই (intimate)')
assert.ok(BENGALI_HONESTY_NOTE.includes('ISO 15919'))
assert.ok(BENGALI_HONESTY_NOTE.includes('not tonal'))

console.log('bengali.smoke ok')
