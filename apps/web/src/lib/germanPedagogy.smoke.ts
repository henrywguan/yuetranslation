import assert from 'node:assert/strict'
import {
  GERMAN_HONESTY_NOTE,
  detectGermanAddress,
  germanAddressChip,
  germanAddressLabel,
} from './germanPedagogy.ts'

assert.equal(detectGermanAddress('Hallo, wie geht’s?'), null)
assert.equal(detectGermanAddress('Willst du einen Kaffee?'), 'du')
assert.equal(detectGermanAddress('Wie geht es Ihnen?'), 'sie')
assert.equal(detectGermanAddress('Ihre Karte, bitte.'), 'sie')
assert.equal(detectGermanAddress('Du und Ihre Freunde'), 'mixed')
assert.equal(germanAddressChip('du'), 'du')
assert.equal(germanAddressLabel('sie'), 'Sie (formal)')
assert.ok(GERMAN_HONESTY_NOTE.includes('umlaut'))

console.log('germanPedagogy.smoke: ok')
