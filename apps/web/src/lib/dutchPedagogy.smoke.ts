import assert from 'node:assert/strict'
import {
  DUTCH_HONESTY_NOTE,
  detectDutchAddress,
  dutchAddressChip,
  dutchAddressLabel,
} from './dutchPedagogy.ts'

assert.equal(detectDutchAddress('Hallo, hoe gaat het?'), null)
assert.equal(detectDutchAddress('Wil je een koffie?'), 'je')
assert.equal(detectDutchAddress('Hoe gaat het met u?'), 'u')
assert.equal(detectDutchAddress('Uw ticket, alstublieft.'), 'u')
assert.equal(detectDutchAddress('Jij en uw vriend'), 'mixed')
assert.equal(dutchAddressChip('je'), 'je')
assert.equal(dutchAddressLabel('u'), 'u (formal)')
assert.ok(DUTCH_HONESTY_NOTE.includes('ij'))

console.log('dutchPedagogy.smoke: ok')
