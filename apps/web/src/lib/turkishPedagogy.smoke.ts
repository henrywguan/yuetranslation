import assert from 'node:assert/strict'
import {
  TURKISH_HONESTY_NOTE,
  detectTurkishAddress,
  turkishAddressChip,
  turkishAddressLabel,
  turkishHarmony,
  turkishLower,
  turkishUpper,
} from './turkishPedagogy.ts'

assert.equal(turkishLower('IŞIK'), 'ışık', 'I lowercases to dotless ı')
assert.equal(turkishLower('İSTANBUL'), 'istanbul', 'İ lowercases to dotted i')
assert.equal(turkishUpper('istanbul'), 'İSTANBUL')
assert.equal(turkishUpper('ılık'), 'ILIK')

assert.equal(detectTurkishAddress('Merhaba!'), null)
assert.equal(detectTurkishAddress('Nasılsın?'), 'sen')
assert.equal(detectTurkishAddress('Sen nereye gidiyorsun?'), 'sen')
assert.equal(detectTurkishAddress('Çay ister misin?'), 'sen')
assert.equal(detectTurkishAddress('Nasılsınız?'), 'siz')
assert.equal(detectTurkishAddress('Size nasıl yardımcı olabilirim?'), 'siz')
assert.equal(detectTurkishAddress('Kolay gelsin, sağ olsun.'), null, '3sg optative is not sen')
assert.equal(detectTurkishAddress('SİZ ve sen'), 'mixed')
assert.equal(turkishAddressChip('siz'), 'siz')
assert.equal(turkishAddressLabel('sen'), 'sen (informal)')

assert.deepEqual(turkishHarmony('ev'), { twoFold: 'e', fourFold: 'i' })
assert.deepEqual(turkishHarmony('kitap'), { twoFold: 'a', fourFold: 'ı' })
assert.deepEqual(turkishHarmony('okul'), { twoFold: 'a', fourFold: 'u' })
assert.deepEqual(turkishHarmony('göz'), { twoFold: 'e', fourFold: 'ü' })
assert.deepEqual(turkishHarmony('KIZ'), { twoFold: 'a', fourFold: 'ı' }, 'capital I harmonizes as ı')
assert.equal(turkishHarmony('psst'), null)
assert.ok(TURKISH_HONESTY_NOTE.includes('vowel harmony'))
assert.ok(TURKISH_HONESTY_NOTE.includes('not tonal'))

console.log('turkishPedagogy.smoke: ok')
