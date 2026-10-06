import assert from 'node:assert/strict'
import {
  FRENCH_HONESTY_NOTE,
  detectFrenchAddress,
  frenchAddressChip,
  frenchAddressLabel,
} from './frenchPedagogy.ts'

assert.equal(detectFrenchAddress('Salut, ça va ?'), null)
assert.equal(detectFrenchAddress('Tu veux un café ?'), 'tu')
assert.equal(detectFrenchAddress('Comment allez-vous ?'), 'vous')
assert.equal(detectFrenchAddress('Votre billet, s’il vous plaît.'), 'vous')
assert.equal(detectFrenchAddress('Toi et vos amis'), 'mixed')
assert.equal(frenchAddressChip('tu'), 'tu')
assert.equal(frenchAddressLabel('vous'), 'vous (formal / plural)')
assert.ok(FRENCH_HONESTY_NOTE.includes('liaison'))

console.log('frenchPedagogy.smoke: ok')
