import assert from 'node:assert/strict'
import {
  EUROPEAN_PORTUGUESE_HONESTY_NOTE,
  europeanStressChipShort,
  europeanStressChips,
  europeanStressClass,
  europeanStressLabel,
  portugueseBareWord,
} from './europeanPortugueseStress.ts'

assert.equal(portugueseBareWord('Olá?'), 'Olá')
assert.equal(europeanStressClass('autocarro'), 'paroxitona')
assert.equal(europeanStressClass('telemóvel'), 'paroxitona')
assert.equal(europeanStressClass('género'), 'proparoxitona', 'Portugal acute spelling')
assert.equal(europeanStressClass('António'), 'paroxitona')
assert.equal(europeanStressClass('café'), 'oxitona')
assert.equal(europeanStressClass('Portugal'), 'oxitona')
assert.equal(europeanStressClass(''), null)
assert.deepEqual(
  europeanStressChips('Olá, tudo bem?').map((c) => c.w),
  ['Olá', 'tudo', 'bem'],
)
assert.equal(europeanStressLabel('oxitona'), 'Final stress (oxítona)')
assert.equal(europeanStressChipShort('proparoxitona'), 'Antepenult')
assert.ok(EUROPEAN_PORTUGUESE_HONESTY_NOTE.includes('unstressed vowels'))

console.log('europeanPortugueseStress.smoke: ok')
