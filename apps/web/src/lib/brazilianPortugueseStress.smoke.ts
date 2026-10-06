import assert from 'node:assert/strict'
import {
  brazilianStressChipShort,
  brazilianStressClass,
  brazilianStressLabel,
  portugueseBareWord,
  portugueseSyllables,
} from './brazilianPortugueseStress.ts'

assert.equal(portugueseBareWord('Olá?'), 'Olá')
assert.equal(brazilianStressClass('café'), 'oxitona')
assert.equal(brazilianStressClass('você'), 'oxitona')
assert.equal(brazilianStressClass('casa'), 'paroxitona')
assert.equal(brazilianStressClass('ônibus'), 'proparoxitona')
assert.equal(brazilianStressClass('médico'), 'proparoxitona')
assert.equal(brazilianStressClass('Brasil'), 'oxitona')
assert.equal(brazilianStressClass(''), null)
assert.ok(portugueseSyllables('ônibus').length >= 2)
assert.equal(brazilianStressLabel('oxitona'), 'Final stress (oxítona)')
assert.equal(brazilianStressChipShort('paroxitona'), 'Penult')

console.log('brazilianPortugueseStress.smoke: ok')
