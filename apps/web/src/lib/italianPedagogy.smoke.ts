import assert from 'node:assert/strict'
import {
  ITALIAN_HONESTY_NOTE,
  detectItalianAddress,
  italianAddressChip,
  italianAddressLabel,
} from './italianPedagogy.ts'

assert.equal(detectItalianAddress('Ciao, come stai?'), null)
assert.equal(detectItalianAddress('Tu vuoi un caffè?'), 'tu')
assert.equal(detectItalianAddress('Come sta Lei?'), 'lei')
assert.equal(detectItalianAddress('Mi scusi, dov’è la stazione?'), 'lei')
assert.equal(detectItalianAddress('Tu e Lei insieme'), 'mixed')
assert.equal(italianAddressChip('tu'), 'tu')
assert.equal(italianAddressLabel('lei'), 'Lei (formal)')
assert.ok(ITALIAN_HONESTY_NOTE.includes('accent'))

console.log('italianPedagogy.smoke: ok')
